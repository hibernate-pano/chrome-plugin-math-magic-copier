document.addEventListener("DOMContentLoaded", async () => {
  // 检查URL中是否有错误信息
  const urlParams = new URLSearchParams(window.location.search);
  const error = urlParams.get("error");
  if (error) {
    showStatus(decodeURIComponent(error));
    return;
  }

  // 检查是否有上一次的截图数据
  try {
    const response = await chrome.runtime.sendMessage({
      type: "GET_LAST_CAPTURE",
    });
    if (response && response.imageData) {
      // 显示图片
      currentImageData = response.imageData;
      showPreviewImage(`data:image/jpeg;base64,${response.imageData}`);
      enableAnalyzeButton();
    }
  } catch (error) {
    console.error("获取截图数据失败:", error);
  }
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
const analyzeButton = document.getElementById("analyzeImage");
const clearButton = document.getElementById("clearImage");
const statusDiv = document.getElementById("status");

let currentImageData = null; // 添加当前图片数据变量
let currentLatex = ""; // 添加当前LaTeX变量

// 工具函数
function showStatus(message, type = "error", duration = 3000) {
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  statusDiv.style.display = "block";

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
        statusDiv.className = `status ${newType}`;
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

// 修改图片预览区域的点击事件
imagePreview.addEventListener("click", (e) => {
  console.log("Image preview clicked", e.target);
  if (e.target === clearButton) {
    console.log("Clear button clicked, ignoring upload trigger");
    return;
  }

  if (!previewImage.style.display || previewImage.style.display === "none") {
    console.log("Triggering file input click");
    fileInput.click();
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
  // 验证文件类型
  if (!file.type.startsWith("image/")) {
    showStatus("请选择图片文件");
    return;
  }

  // 特别处理 SVG 文件
  const isSVG = file.type === "image/svg+xml";

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      // 保存完整的 data URL
      const base64Data = e.target.result;

      if (isSVG) {
        console.log("处理 SVG 文件，将转换为 PNG 格式");
        showStatus("正在转换 SVG 文件...", "info");

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
              reject(error);
            }
          };
          img.onerror = () => reject(new Error("SVG 加载失败"));
          img.src = base64Data;
        });
      } else {
        currentImageData = base64Data;
        showPreviewImage(base64Data);
      }

      if (currentImageData) {
        console.log("Image data length:", currentImageData.length);
      } else {
        throw new Error("图片数据处理失败");
      }
    } catch (error) {
      console.error("处理图片失败:", error);
      showStatus("处理图片失败: " + error.message);
    }
  };
  reader.onerror = () => {
    showStatus("读取文件失败");
  };

  reader.readAsDataURL(file);
}

// 显示预览图片
function showPreviewImage(src) {
  previewImage.src = src;
  previewImage.style.display = "block";
  imagePreview.querySelector(".placeholder").style.display = "none";
  clearButton.style.display = "flex";
  enableAnalyzeButton();
}

// 清除图片
clearButton.addEventListener("click", (e) => {
  e.stopPropagation(); // 阻止事件冒泡
  previewImage.src = "";
  previewImage.style.display = "none";
  imagePreview.querySelector(".placeholder").style.display = "block";
  clearButton.style.display = "none";
  currentImageData = null;
  disableAnalyzeButton();
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

    // 隐藏加载状态
    loadingStatus.hide();
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

// 添加截图按钮事件监听
startCapture.addEventListener("click", async () => {
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
});
