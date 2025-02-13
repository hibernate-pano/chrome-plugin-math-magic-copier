// 处理来自popup的消息
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  console.log('Background script received message:', message.type);

  if (message.type === 'ANALYZE_IMAGE') {
    console.log('收到图片分析请求');
    console.log('Received image data length:', message.imageData.length);  // 调试用

    // 调用硅基流动 API 分析图片
    analyzeImage(message.imageData)
      .then(async result => {
        console.log('API返回结果:', result);
        if (result && result.words_result && result.words_result.length > 0) {
          try {
            // 提取文字
            const words = result.words_result.map(item => item.words).join('\n');
            console.log('OCR 识别文本:', words);

            // 转换为 LaTeX
            const latex = await convertToMathType(words);
            console.log('转换后的 LaTeX:', latex);

            // 返回原始文本和转换后的结果
            sendResponse({
              success: true,
              rawText: words,
              result: latex
            });
          } catch (error) {
            console.error('处理结果失败:', error);
            sendResponse({
              success: false,
              error: '处理结果失败: ' + error.message
            });
          }
        } else {
          console.error('API返回结果格式不正确:', result);
          sendResponse({
            success: false,
            error: '识别结果为空，请确保图片包含清晰的数学公式'
          });
        }
      })
      .catch(error => {
        console.error('分析失败:', error);
        sendResponse({
          success: false,
          error: error.message || '分析失败，请重试'
        });
      });

    return true; // 保持消息通道开放
  }

  if (message.type === 'CAPTURE_COMPLETE') {
    // 立即发送一个确认响应
    sendResponse({ status: 'processing' });

    // 异步处理图片
    processImage(message.imageData, sender.tab.id)
      .then(() => {
        console.log('Image processing completed successfully');
      })
      .catch(error => {
        console.error('Image processing failed:', error);
        // 显示错误通知
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icon.png',
          title: '处理失败',
          message: error.message || '图片处理失败，请重试'
        });
      });
  }

  if (message.type === 'CONVERT_TO_MATHTYPE') {
    try {
      const mathTypeFormat = convertToMathType(message.text);
      sendResponse({
        success: true,
        result: mathTypeFormat
      });
    } catch (error) {
      console.error('转换到 MathType 格式失败:', error);
      sendResponse({
        success: false,
        error: error.message || '转换失败'
      });
    }
    return false;
  }

  if (message.type === 'COPY_TO_CLIPBOARD') {
    copyToClipboard(message.text)
      .then(() => {
        sendResponse({ success: true });
      })
      .catch(error => {
        console.error('复制失败:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true;  // 保持消息通道开放
  }

  // 返回 true 表示我们会异步发送响应
  return true;
});

// 转换为 MathType 格式
function convertToMathType(text) {
  // 这里可以添加更多的转换规则
  return text.replace(/\\frac{([^}]*)}{([^}]*)}/g, '($1)/($2)')
    .replace(/\\sqrt{([^}]*)}/g, 'sqrt($1)')
    .replace(/\\sum_{([^}]*)}/g, 'sum($1)')
    .replace(/\\int_{([^}]*)}/g, 'int($1)')
    .replace(/\\alpha/g, 'α')
    .replace(/\\beta/g, 'β')
    .replace(/\\gamma/g, 'γ')
    .replace(/\\delta/g, 'δ')
    .replace(/\\epsilon/g, 'ε')
    .replace(/\\theta/g, 'θ')
    .replace(/\\pi/g, 'π')
    .replace(/\\sigma/g, 'σ')
    .replace(/\\omega/g, 'ω')
    .replace(/_{([^}]*)}/g, '_$1')
    .replace(/\^{([^}]*)}/g, '^$1');
}

// 处理图片识别和转换
async function processImage(imageData, tabId) {
  try {
    console.log('开始处理图片...');

    // 显示处理中的通知
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon.png',
      title: '正在处理',
      message: '正在识别公式，请稍候...'
    });

    // 调用硅基流动 API 进行 OCR 识别
    const result = await analyzeImage(imageData);
    console.log('OCR 识别结果:', result);

    if (!result || !result.words_result) {
      throw new Error('识别失败：未能获取有效的识别结果');
    }

    // 转换为 MathType 格式
    const mathTypeData = await convertToMathType(result.words_result[0].words);
    console.log('转换为 MathType 格式:', mathTypeData);

    // 在当前标签页中执行剪贴板写入
    const clipboardResult = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: async (text) => {
        try {
          await navigator.clipboard.writeText(text);
          return { success: true, data: text };
        } catch (error) {
          console.error('剪贴板写入失败:', error);
          return { success: false, error: error.message };
        }
      },
      args: [mathTypeData]
    });

    const clipboardStatus = clipboardResult[0].result;
    if (clipboardStatus.success) {
      // 显示成功通知
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon.png',
        title: '公式已复制',
        message: '公式已成功复制到剪贴板！'
      });
    } else {
      // 显示剪贴板错误通知，但包含识别结果
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon.png',
        title: '复制失败',
        message: '公式识别成功，但复制到剪贴板失败。请手动复制以下内容：' + mathTypeData
      });
    }
  } catch (error) {
    console.error('处理失败:', error);
    // 显示错误通知
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon.png',
      title: '处理失败',
      message: error.message || '无法处理公式图片，请重试'
    });
    throw error;
  }
}

// 复制到剪贴板
async function copyToClipboard(text) {
  try {
    // 创建一个临时的 background page
    const backgroundPage = await chrome.runtime.getBackgroundPage();
    if (backgroundPage) {
      const textarea = backgroundPage.document.createElement('textarea');
      textarea.value = text;
      backgroundPage.document.body.appendChild(textarea);
      textarea.select();
      backgroundPage.document.execCommand('copy');
      backgroundPage.document.body.removeChild(textarea);
    } else {
      // 如果无法获取 background page，尝试使用 scripting API
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: (textToCopy) => {
            navigator.clipboard.writeText(textToCopy);
          },
          args: [text]
        });
      } else {
        throw new Error('无法找到活动标签页');
      }
    }

    console.log('已复制到剪贴板:', text);

    // 显示通知
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon.png',
      title: '复制成功',
      message: '公式已复制到剪贴板，可以粘贴到 Word 中了'
    });
  } catch (error) {
    console.error('复制到剪贴板失败:', error);
    throw new Error('无法复制到剪贴板: ' + error.message);
  }
}

// 通过注入脚本复制到剪贴板
async function copyToClipboardViaTab(text) {
  try {
    // 获取当前标签页
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!tab) {
      throw new Error('无法找到活动标签页');
    }

    // 注入并执行复制脚本
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (textToCopy) => {
        return new Promise((resolve, reject) => {
          try {
            navigator.clipboard.writeText(textToCopy).then(() => {
              resolve(true);
            }).catch(reject);
          } catch (error) {
            reject(error);
          }
        });
      },
      args: [text]
    });

    // 显示通知
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon.png',
      title: '复制成功',
      message: '公式已复制到剪贴板，可以粘贴到 Word 中了'
    });

    console.log('已复制到剪贴板:', text);
  } catch (error) {
    console.error('复制到剪贴板失败:', error);
    throw new Error('无法复制到剪贴板: ' + error.message);
  }
}

// 分析图片
async function analyzeImage(imageData) {
  try {
    const API_URL = 'https://api.siliconflow.cn/v1/chat/completions'; // 替换为实际的硅基流动 API 地址
    const API_KEY = 'sk-bpbqulqtsmbywglsemzqantxqhmilksogyeitgcpkbvwioix'; // 需要填入实际的 API key

    // 移除 base64 数据的前缀
    // const base64Data = imageData.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: 'Pro/Qwen/Qwen2-VL-7B-Instruct',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: imageData
                }
              },
              {
                type: 'text',
                text: `
                请识别这张图片中的数学公式，并以以下格式输出。如果有多个公式，请用换行分隔。
                
                ## 纯文本:
                {text}

                ## LaTeX 格式:
                {latex}
                `
              }
            ]
          }
        ],
        temperature: 0.01,
        top_p: 0.95
      })
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const result = await response.json();

    // 提取 API 返回的文本内容
    const text = result.choices[0].message.content;

    // 提取 LaTeX 部分
    const latexMatch = text.match(/## LaTeX 格式:\s*([\s\S]*?)(?=\n##|$)/);
    const latex = latexMatch ? latexMatch[1].trim() : text;

    // 清理 LaTeX 格式
    const cleanLatex = latex
      .replace(/#/g, '\\#')
      .replace(/\n/g, ' ')
      .replace(/^\s*\\\[\s*|\s*\\\]\s*$/g, '')  // 移除前后的 \[ 和 \]
      .trim();

    return {
      words_result: [{
        words: cleanLatex
      }]
    };
  } catch (error) {
    console.error('Image analysis failed:', error);
    throw new Error('图片分析失败：' + (error.message || '未知错误'));
  }
}

// 处理扩展图标点击事件
chrome.action.onClicked.addListener(async (tab) => {
  // 检查是否已经打开了窗口
  const existingWindows = await chrome.windows.getAll();
  const existingPopup = existingWindows.find(win =>
    win.type === 'popup' &&
    win.title === 'Math Formula to MathType'
  );

  if (existingPopup) {
    // 如果窗口已存在，就激活它
    await chrome.windows.update(existingPopup.id, {
      focused: true,
      drawAttention: true
    });
  } else {
    // 获取当前窗口信息
    const currentWindow = await chrome.windows.getCurrent();

    // 计算新窗口位置，确保在屏幕内
    let left = currentWindow.left + 50;  // 在当前窗口右侧偏移一点
    let top = currentWindow.top + 50;    // 在当前窗口下方偏移一点

    // 创建新窗口
    chrome.windows.create({
      url: 'popup.html',
      type: 'popup',
      width: 400,
      height: 600,
      left: left,
      top: top
    });
  }
});