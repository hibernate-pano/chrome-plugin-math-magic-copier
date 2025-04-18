// 存储最后一次截图的数据
let lastCapturedImage = null;
let popupWindowId = null;  // 添加popup窗口ID存储

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
    console.log('收到截图数据');
    if (message.error) {
      // 处理错误情况
      console.error('截图失败:', message.error);
      showErrorNotification(message.error);
    } else {
      // 保存截图数据
      console.log('截图数据长度:', message.imageData ? message.imageData.length : 0);

      // 确保截图数据有效
      if (message.imageData && message.imageData.length > 0) {
        // 如果数据已经是完整的 data URL，则直接保存
        if (message.imageData.startsWith('data:image/')) {
          lastCapturedImage = message.imageData;
        } else {
          // 否则保存原始数据
          lastCapturedImage = message.imageData;
        }

        // 重新打开或更新popup
        reopenPopup();
      } else {
        console.error('截图数据无效');
        showErrorNotification('截图数据无效，请重试');
      }
    }
    sendResponse({ status: 'success' });
    return true;
  }

  if (message.type === 'REOPEN_POPUP') {
    reopenPopup();
    return true;
  }

  if (message.type === 'REOPEN_POPUP_WITH_ERROR') {
    openPopupWithError(message.error);
    return true;
  }

  if (message.type === 'GET_LAST_CAPTURE') {
    sendResponse({ imageData: lastCapturedImage });
    return true;
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

  if (message.type === 'START_CAPTURE') {
    // 向content script发送消息
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'START_CAPTURE' })
          .then(response => {
            console.log('Content script response:', response);
            sendResponse(response);
          })
          .catch(error => {
            console.error('Error sending message to content script:', error);
            sendResponse({ success: false, error: error.message });
          });
      } else {
        sendResponse({ success: false, error: '无法获取当前标签页' });
      }
    });
    return true;  // 保持消息通道开放
  }

  if (message.type === 'CAPTURE_VISIBLE_TAB') {
    console.log('收到截取当前标签页请求');

    try {
      // 获取当前标签页
      chrome.tabs.query({ active: true, currentWindow: true }, async function (tabs) {
        if (!tabs || !tabs[0]) {
          sendResponse({ success: false, error: '无法获取当前标签页' });
          return;
        }

        const tab = tabs[0];

        try {
          // 使用 Chrome API 截取当前标签页
          const imageDataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
          console.log('截取成功，图片数据长度:', imageDataUrl.length);

          // 获取选区信息
          const rect = message.rect;

          if (!rect) {
            sendResponse({ success: false, error: '缺少选区信息' });
            return;
          }

          // 裁剪图片
          const croppedImageData = await cropImage(imageDataUrl, rect);
          console.log('裁剪成功，裁剪后图片数据长度:', croppedImageData.length);

          // 返回裁剪后的图片数据
          sendResponse({ success: true, imageData: croppedImageData });
        } catch (error) {
          console.error('截图失败:', error);
          sendResponse({ success: false, error: error.message || '截图失败' });
        }
      });
    } catch (error) {
      console.error('处理 CAPTURE_VISIBLE_TAB 消息失败:', error);
      sendResponse({ success: false, error: error.message || '截图失败' });
    }

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

// 打开popup并显示图片
async function openPopupWithImage() {
  try {
    // 获取当前窗口信息
    const currentWindow = await chrome.windows.getCurrent();

    // 计算新窗口位置
    const left = currentWindow.left + 50;
    const top = currentWindow.top + 50;

    // 创建新的popup窗口
    chrome.windows.create({
      url: 'popup.html',
      type: 'popup',
      width: 400,
      height: 600,
      left: left,
      top: top
    });
  } catch (error) {
    console.error('打开popup失败:', error);
  }
}

// 打开popup并显示错误信息
async function openPopupWithError(errorMessage) {
  try {
    const currentWindow = await chrome.windows.getCurrent();
    const left = currentWindow.left + 50;
    const top = currentWindow.top + 50;

    chrome.windows.create({
      url: `popup.html?error=${encodeURIComponent(errorMessage)}`,
      type: 'popup',
      width: 400,
      height: 600,
      left: left,
      top: top
    });
  } catch (error) {
    console.error('打开popup失败:', error);
  }
}

// 显示错误通知
function showErrorNotification(error) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'images/icon48.png',
    title: '截图失败',
    message: error
  });
}

// 重新打开或更新popup
async function reopenPopup() {
  try {
    // 获取当前活动标签页
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      throw new Error('无法获取当前标签页');
    }

    // 使用 action.openPopup 打开原生 popup
    await chrome.action.openPopup();
  } catch (error) {
    console.error('打开popup失败:', error);
    showErrorNotification('无法打开预览窗口');
  }
}

// 裁剪图片 - 使用 OffscreenCanvas
async function cropImage(imageDataUrl, rect) {
  return new Promise((resolve, reject) => {
    try {
      // 创建一个 Blob URL
      fetch(imageDataUrl)
        .then(response => response.blob())
        .then(blob => createImageBitmap(blob))
        .then(imageBitmap => {
          try {
            // 创建 OffscreenCanvas
            const canvas = new OffscreenCanvas(rect.width, rect.height);
            const ctx = canvas.getContext('2d');

            // 设置 Canvas 尺寸为选区大小
            canvas.width = rect.width;
            canvas.height = rect.height;

            // 绘制裁剪后的图片
            ctx.drawImage(
              imageBitmap,
              rect.left, rect.top, rect.width, rect.height,  // 源图片中的选区
              0, 0, rect.width, rect.height  // 目标 Canvas 中的位置和尺寸
            );

            // 转换为 Blob
            return canvas.convertToBlob({ type: 'image/png' });
          } catch (error) {
            console.error('裁剪图片失败:', error);
            reject(error);
          }
        })
        .then(blob => {
          // 将 Blob 转换为 Data URL
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = () => reject(new Error('转换图片数据失败'));
          reader.readAsDataURL(blob);
        })
        .catch(error => {
          console.error('处理图片失败:', error);
          reject(error);
        });
    } catch (error) {
      console.error('创建图片元素失败:', error);
      reject(error);
    }
  });
}

// 监听窗口关闭事件
chrome.windows.onRemoved.addListener((windowId) => {
  // 不再需要处理窗口ID
});

// 监听快捷键
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'capture_formula') {
    // 获取当前活动标签页
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'images/icon48.png',
        title: '无法截图',
        message: '无法获取当前标签页'
      });
      return;
    }

    try {
      // 发送消息给内容脚本开始截图
      // 不需要再次注入content.js，因为它已经在manifest.json中注入了
      await chrome.tabs.sendMessage(tab.id, { type: "START_CAPTURE" });
    } catch (error) {
      console.error('启动截图失败:', error);
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'images/icon48.png',
        title: '截图失败',
        message: error.message || '无法启动截图功能'
      });
    }
  }
});