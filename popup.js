document.addEventListener("DOMContentLoaded", async () => {
  // 检查URL中是否有错误信息
  const urlParams = new URLSearchParams(window.location.search);
  const error = urlParams.get("error");
  if (error) {
    showStatus(decodeURIComponent(error));
    return;
  }

  // 获取插件版本号
  try {
    const manifest = chrome.runtime.getManifest();
    const versionElement = document.querySelector('.app-version');
    if (versionElement && manifest.version) {
      versionElement.textContent = `v${manifest.version}`;
    }
  } catch (error) {
    console.error('获取插件版本号失败:', error);
  }

  // 检查是否有上一次的截图数据
  try {
    const response = await chrome.runtime.sendMessage({
      type: "GET_LAST_CAPTURE",
    });
    console.log('获取上一次截图数据:', response);

    if (response && response.imageData) {
      // 显示图片
      currentImageData = response.imageData;

      // 处理不同格式的图片数据
      if (typeof response.imageData === 'string') {
        if (response.imageData.startsWith('data:image/')) {
          // 如果已经是 data URL，直接使用
          showPreviewImage(response.imageData);
        } else {
          // 如果是 base64 字符串，添加前缀
          showPreviewImage(`data:image/png;base64,${response.imageData}`);
        }
        enableAnalyzeButton();
      } else {
        console.error('无效的图片数据格式');
      }
    }
  } catch (error) {
    console.error("获取截图数据失败:", error);
  }

  // 注册快捷键事件
  registerShortcuts();
});

function displayResult(latex) {
  const resultContainer = document.getElementById("resultContainer");
  const latexContent = document.getElementById("latexContent");

  // 显示结果容器
  resultContainer.style.display = "block";

  // 清理 LaTeX 字符串，移除或替换不合法字符
  const cleanLatex = latex
    .replace(/^```latex\s*/, "") // 移除开头的 ```latex
    .replace(/\s*```$/, "") // 移除结尾的 ```
    .replace(/#/g, "\\#") // 将 # 替换为 \#
    .replace(/\n/g, " ") // 将换行替换为空格
    .replace(/^\s*\\\[\s*|\s*\\\]\s*$/g, "") // 移除前后的 \[ 和 \]
    .trim(); // 移除首尾空白

  // 设置 LaTeX 源码
  latexContent.textContent = cleanLatex;
}

function handleAnalysisResult(result) {
  const resultContainer = document.getElementById("resultContainer");
  const latexContent = document.getElementById("latexContent");

  if (result.success) {
    // 提取 LaTeX 部分
    const latexMatch = result.result.match(
      /## LaTeX 格式:\s*([\s\S]*?)(?=\n##|$)/
    );
    if (latexMatch) {
      currentLatex = latexMatch[1].trim();
    } else {
      currentLatex = result.result; // 如果没有找到标记，使用整个结果
    }

    // 更新 LaTeX 内容
    latexContent.textContent = currentLatex;

    // 显示结果容器
    resultContainer.style.display = "block";

    // 触发重排后添加显示类
    requestAnimationFrame(() => {
      resultContainer.classList.add("show");
    });
  } else {
    // 隐藏结果容器
    resultContainer.classList.remove("show");
    setTimeout(() => {
      resultContainer.style.display = "none";
    }, 300);

    showStatus(result.error);
  }
}

// DOM 元素
const startCapture = document.getElementById("startCapture");
const imagePreview = document.getElementById("imagePreview");
const previewImage = document.getElementById("previewImage");
const fileInput = document.getElementById("fileInput");
const uploadBtn = document.getElementById("uploadBtn");
const analyzeButton = document.getElementById("analyzeImage");
const clearButton = document.getElementById("clearImage");
const statusDiv = document.getElementById("status");

let currentImageData = null; // 添加当前图片数据变量
let currentLatex = ""; // 添加当前LaTeX变量

// 工具函数
function showStatus(message, type = "error", duration = 3000) {
  statusDiv.textContent = message;
  statusDiv.className = `status-message ${type}`;
  statusDiv.style.display = "flex";

  if (duration > 0) {
    setTimeout(() => {
      hideStatus();
    }, duration);
  }

  return {
    hide: hideStatus,
    update: (newMessage, newType) => {
      statusDiv.textContent = newMessage;
      if (newType) {
        statusDiv.className = `status-message ${newType}`;
      }
    },
  };
}

function hideStatus() {
  statusDiv.style.opacity = "0";
  setTimeout(() => {
    statusDiv.style.display = "none";
    statusDiv.style.opacity = "1";
  }, 300);
}

function enableAnalyzeButton() {
  analyzeButton.disabled = false;
}

function disableAnalyzeButton() {
  analyzeButton.disabled = true;
}

// 上传按钮点击事件
uploadBtn.addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();
  console.log("Upload button clicked");

  // 使用更安全的方式触发文件选择对话框
  const event = new MouseEvent('click', {
    view: window,
    bubbles: false,  // 阻止事件冒泡
    cancelable: true
  });
  fileInput.dispatchEvent(event);
});

// 修改图片预览区域的点击事件
imagePreview.addEventListener("click", (e) => {
  console.log("Image preview clicked", e.target);

  // 如果点击的是清除按钮或上传按钮，不处理
  if (e.target === clearButton || e.target === uploadBtn ||
    e.target.parentElement === uploadBtn) {
    console.log("Button clicked, ignoring upload trigger");
    return;
  }

  // 如果没有显示图片，则触发文件选择
  if (!previewImage.style.display || previewImage.style.display === "none") {
    console.log("Triggering file input click from preview area");
    uploadBtn.click(); // 直接触发上传按钮的点击事件
  }
});

// 添加拖放功能
imagePreview.addEventListener('dragover', (e) => {
  e.preventDefault();
  e.stopPropagation();
  imagePreview.classList.add('drag-over');
});

imagePreview.addEventListener('dragleave', (e) => {
  e.preventDefault();
  e.stopPropagation();
  imagePreview.classList.remove('drag-over');
});

imagePreview.addEventListener('drop', (e) => {
  e.preventDefault();
  e.stopPropagation();
  imagePreview.classList.remove('drag-over');

  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
    const file = e.dataTransfer.files[0];
    if (file.type.startsWith('image/')) {
      handleImageFile(file);
    } else {
      showStatus('请拖放图片文件');
    }
  }
});

// 确保文件输入的变更事件正确绑定
fileInput.addEventListener("change", (e) => {
  console.log("File input changed", e.target.files);
  const file = e.target.files[0];
  if (file) {
    console.log("Processing file:", file.name, file.type);
    handleImageFile(file);
  }
  fileInput.value = "";
});

// 处理图片文件的函数
function handleImageFile(file) {
  console.log('处理图片文件:', file.name, file.type, file.size);

  // 显示加载状态
  const loadingStatus = showStatus('正在加载图片...', 'info', 0);

  // 验证文件类型
  if (!file.type.startsWith("image/")) {
    loadingStatus.update('请选择图片文件', 'error');
    setTimeout(() => loadingStatus.hide(), 3000);
    return;
  }

  // 特别处理 SVG 文件
  const isSVG = file.type === "image/svg+xml";

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      // 保存完整的 data URL
      const base64Data = e.target.result;
      console.log('文件读取成功, 数据长度:', base64Data.length);

      // 更新加载状态
      loadingStatus.update('正在处理图片...', 'info');

      if (isSVG) {
        console.log("处理 SVG 文件，将转换为 PNG 格式");
        loadingStatus.update('正在转换 SVG 文件...', 'info');

        // 创建图片元素用于转换
        await new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            try {
              // 创建 canvas 进行转换
              const canvas = document.createElement("canvas");
              const ctx = canvas.getContext("2d");

              // 使用较大的尺寸以保持清晰度
              canvas.width = Math.min(img.width * 2, 4000);
              canvas.height = Math.min(img.height * 2, 4000);

              // 使用白色背景
              ctx.fillStyle = "white";
              ctx.fillRect(0, 0, canvas.width, canvas.height);

              // 绘制 SVG
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

              // 转换为高质量 PNG
              const pngData = canvas.toDataURL("image/png", 1.0);
              currentImageData = pngData;
              showPreviewImage(pngData);
              resolve();
            } catch (error) {
              console.error('转换 SVG 失败:', error);
              reject(error);
            }
          };
          img.onerror = (e) => {
            console.error('SVG 图片加载失败:', e);
            reject(new Error("SVG 加载失败"));
          };
          img.src = base64Data;
        });
      } else {
        // 处理普通图片
        console.log('处理普通图片格式:', file.type);
        currentImageData = base64Data;
        showPreviewImage(base64Data);
      }

      if (currentImageData) {
        console.log("Image data length:", currentImageData.length);
        // 隐藏加载状态
        loadingStatus.hide();
      } else {
        throw new Error("图片数据处理失败");
      }
    } catch (error) {
      console.error("处理图片失败:", error);
      loadingStatus.update('处理图片失败: ' + error.message, 'error');
      setTimeout(() => loadingStatus.hide(), 3000);
    }
  };
  reader.onerror = (error) => {
    console.error('读取文件失败:', error);
    loadingStatus.update('读取文件失败', 'error');
    setTimeout(() => loadingStatus.hide(), 3000);
  };

  try {
    reader.readAsDataURL(file);
  } catch (error) {
    console.error('调用 readAsDataURL 失败:', error);
    loadingStatus.update('读取文件失败: ' + error.message, 'error');
    setTimeout(() => loadingStatus.hide(), 3000);
  }
}

// 显示预览图片
function showPreviewImage(src) {
  console.log('显示预览图片:', src.substring(0, 50) + '...');

  // 确保图片源有效
  if (!src) {
    console.error('图片源无效');
    return;
  }

  // 设置图片源
  previewImage.src = src;

  // 添加图片加载事件
  previewImage.onload = function () {
    console.log('图片加载成功');
    // 显示图片
    previewImage.style.display = "block";
    // 隐藏占位符
    imagePreview.querySelector(".placeholder").style.display = "none";
    // 显示清除按钮
    clearButton.style.display = "flex";
    // 启用分析按钮
    enableAnalyzeButton();
  };

  // 添加图片错误事件
  previewImage.onerror = function () {
    console.error('图片加载失败:', src.substring(0, 100));
    showStatus('图片加载失败', 'error');
  };
}

// 清除图片
clearButton.addEventListener("click", (e) => {
  e.stopPropagation(); // 阻止事件冒泡
  console.log('清除图片');
  previewImage.src = "";
  previewImage.style.display = "none";
  const placeholder = imagePreview.querySelector(".placeholder");
  placeholder.style.display = "flex";
  clearButton.style.display = "none";
  currentImageData = null;
  disableAnalyzeButton();

  // 隐藏结果区域
  const resultContainer = document.getElementById("resultContainer");
  if (resultContainer.style.display !== "none") {
    resultContainer.classList.remove("show");
    setTimeout(() => {
      resultContainer.style.display = "none";
    }, 300);
  }
});

// 分析按钮点击事件
analyzeButton.addEventListener("click", async () => {
  if (!currentImageData) {
    showStatus("请先选择或截取一张图片");
    return;
  }

  try {
    // 显示持续的加载状态
    const loadingStatus = showStatus("正在分析图片...", "info", 0);
    analyzeButton.disabled = true;

    // 添加加载动画类
    statusDiv.innerHTML = `
      <div class="loading-spinner"></div>
      <span>正在分析图片...</span>
    `;

    // 确保发送完整的 data URL
    const imageData = currentImageData.startsWith("data:image/")
      ? currentImageData
      : `data:image/jpeg;base64,${currentImageData}`;

    // 发送消息到 background script
    const response = await chrome.runtime.sendMessage({
      type: "ANALYZE_IMAGE",
      imageData: imageData,
    });

    console.log("OCR 识别结果:", response);

    // 更新状态为处理中
    loadingStatus.update("正在处理识别结果...");

    // 等待一小段时间以确保状态更新显示
    await new Promise((resolve) => setTimeout(resolve, 300));

    // 处理分析结果
    handleAnalysisResult(response);

    // 如果分析成功，保存到历史记录
    if (response.success && currentLatex) {
      console.log('分析成功，尝试保存到历史记录');
      const saved = await saveToHistory(imageData, currentLatex);
      if (saved) {
        console.log('历史记录保存成功');
      } else {
        console.warn('历史记录保存失败');
      }
    }

    // 隐藏加载状态
    loadingStatus.hide();

    // 成功后滚动到结果区域
    const resultContainer = document.getElementById("resultContainer");
    if (resultContainer.style.display !== "none") {
      resultContainer.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  } catch (error) {
    console.error("分析失败:", error);
    showStatus("分析失败: " + error.message);
  } finally {
    analyzeButton.disabled = false;
  }
});

// 复制按钮点击事件
document.getElementById("copyLatex").addEventListener("click", async () => {
  const latexContent = document.getElementById("latexContent");
  if (!latexContent.textContent) {
    showStatus("没有可复制的内容");
    return;
  }

  try {
    // 提取纯 LaTeX 内容
    const latexText = latexContent.textContent
      .replace(/^```latex\s*/, "") // 移除开头的 ```latex
      .replace(/\s*```$/, "") // 移除结尾的 ```
      .trim(); // 移除首尾空白

    await navigator.clipboard.writeText(latexText);
    showStatus("LaTeX 已复制到剪贴板", "success");
  } catch (err) {
    console.error("复制失败:", err);
    // 降级方案：使用 background 脚本复制
    try {
      await chrome.runtime.sendMessage({
        type: "COPY_TO_CLIPBOARD",
        text: latexText,
      });
      showStatus("LaTeX 已复制到剪贴板", "success");
    } catch (backgroundErr) {
      showStatus("复制失败，请手动复制", "error");
    }
  }
});

// 注册快捷键
function registerShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Alt+Shift+C 快捷键触发截图
    if (e.altKey && e.shiftKey && e.key === 'C') {
      e.preventDefault();
      startCapture.click();
    }

    // Escape 键关闭弹窗
    if (e.key === 'Escape') {
      window.close();
    }
  });
}

// 截图函数
async function captureScreenshot() {
  try {
    // 获取当前活动标签页
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab) {
      showStatus("无法获取当前标签页");
      return;
    }

    // 注入内容脚本
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"],
    });

    // 发送消息给内容脚本开始截图
    await chrome.tabs.sendMessage(tab.id, { type: "START_CAPTURE" });

    // 关闭popup窗口
    window.close();
  } catch (error) {
    console.error("启动截图失败:", error);
    showStatus("启动截图失败: " + error.message);
  }
}

// 添加截图按钮事件监听
startCapture.addEventListener("click", captureScreenshot);

// 历史记录功能
const historyBtn = document.getElementById('historyBtn');
const historyModal = document.getElementById('historyModal');
const historyCloseBtn = document.getElementById('historyCloseBtn');
const historyList = document.getElementById('historyList');

// 打开历史记录模态框
historyBtn.addEventListener('click', async () => {
  try {
    // 从存储中获取历史记录
    const { history = [] } = await chrome.storage.local.get('history');

    // 清空历史记录列表
    historyList.innerHTML = '';

    if (history.length === 0) {
      // 如果没有历史记录，显示空状态
      historyList.innerHTML = `<div class="history-empty">暂无历史记录<br>请先截取并分析公式</div>`;
    } else {
      // 按时间降序排序
      history.sort((a, b) => b.timestamp - a.timestamp);

      // 生成历史记录列表
      history.forEach((item) => {
        const li = document.createElement('li');
        li.className = 'history-item';

        // 格式化时间
        const date = new Date(item.timestamp);
        const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

        li.innerHTML = `
          <img src="${item.imageData}" class="history-item-preview" alt="预览">
          <div class="history-item-content">
            <div class="history-item-latex">${item.latex || '无文本'}</div>
            <div class="history-item-time">${formattedDate}</div>
          </div>
        `;

        // 点击历史记录项加载到当前界面
        li.addEventListener('click', () => {
          console.log('点击历史记录项:', item.timestamp);

          try {
            // 验证图片数据
            if (!item.imageData) {
              throw new Error('历史记录中的图片数据无效');
            }

            // 保存数据
            currentImageData = item.imageData;
            currentLatex = item.latex || '';

            // 显示加载状态
            const loadingStatus = showStatus('正在加载历史记录...', 'info', 0);

            // 显示图片
            showPreviewImage(item.imageData);

            // 显示 LaTeX
            const resultContainer = document.getElementById('resultContainer');
            const latexContent = document.getElementById('latexContent');

            latexContent.textContent = currentLatex;
            resultContainer.style.display = 'block';
            requestAnimationFrame(() => {
              resultContainer.classList.add('show');
              // 隐藏加载状态
              loadingStatus.hide();
            });

            // 关闭模态框
            closeHistoryModal();
          } catch (error) {
            console.error('加载历史记录失败:', error);
            showStatus('加载历史记录失败: ' + error.message, 'error');
          }
        });

        historyList.appendChild(li);
      });
    }

    // 显示模态框
    historyModal.classList.add('show');
  } catch (error) {
    console.error('加载历史记录失败:', error);
    showStatus('加载历史记录失败: ' + error.message);
  }
});

// 关闭历史记录模态框
function closeHistoryModal() {
  historyModal.classList.remove('show');
}

// 点击关闭按钮
historyCloseBtn.addEventListener('click', closeHistoryModal);

// 点击模态框外部关闭
historyModal.addEventListener('click', (e) => {
  if (e.target === historyModal) {
    closeHistoryModal();
  }
});

// 保存到历史记录
async function saveToHistory(imageData, latex) {
  try {
    console.log('开始保存到历史记录');

    // 验证数据
    if (!imageData) {
      throw new Error('图片数据为空');
    }

    if (!latex) {
      console.warn('保存的 LaTeX 内容为空');
      latex = '';
    }

    // 获取当前历史记录
    const { history = [] } = await chrome.storage.local.get('history');
    console.log('当前历史记录数量:', history.length);

    // 添加新记录
    const newRecord = {
      imageData,
      latex,
      timestamp: Date.now()
    };

    // 限制历史记录数量，最多保存20条
    const updatedHistory = [newRecord, ...history].slice(0, 20);

    // 保存到存储
    await chrome.storage.local.set({ history: updatedHistory });

    console.log('已保存到历史记录, 新总数:', updatedHistory.length);
    return true;
  } catch (error) {
    console.error('保存历史记录失败:', error);
    return false;
  }
}
