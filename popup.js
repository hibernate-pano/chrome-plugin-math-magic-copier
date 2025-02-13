function displayResult(latex) {
  const resultContainer = document.getElementById('resultContainer');
  const previewContainer = document.getElementById('previewContainer');
  const latexContent = document.getElementById('latexContent');

  // 显示结果容器
  resultContainer.style.display = 'block';

  // 清理 LaTeX 字符串，移除或替换不合法字符
  const cleanLatex = latex
    .replace(/^```latex\s*/, '')    // 移除开头的 ```latex
    .replace(/\s*```$/, '')         // 移除结尾的 ```
    .replace(/#/g, '\\#')           // 将 # 替换为 \#
    .replace(/\n/g, ' ')            // 将换行替换为空格
    .replace(/^\s*\\\[\s*|\s*\\\]\s*$/g, '')  // 移除前后的 \[ 和 \]
    .trim();                        // 移除首尾空白

  // 设置 LaTeX 源码
  latexContent.textContent = cleanLatex;

  try {
    // 设置预览内容并触发 MathJax 渲染
    previewContainer.innerHTML = cleanLatex.includes('\\begin{') 
      ? `$$${cleanLatex}$$` 
      : `$$\\displaystyle ${cleanLatex}$$`;
    
    // 确保 MathJax 已加载
    if (window.MathJax && window.MathJax.typesetPromise) {
      MathJax.typesetPromise([previewContainer]).catch((err) => {
        console.error('MathJax 渲染错误:', err);
        console.log('渲染失败的 LaTeX:', cleanLatex);  // 添加调试信息
        previewContainer.innerHTML = '<span style="color: #dc3545;">公式渲染失败</span>';
      });
    } else {
      // MathJax 未加载完成时的处理
      const checkMathJax = setInterval(() => {
        if (window.MathJax && window.MathJax.typesetPromise) {
          clearInterval(checkMathJax);
          MathJax.typesetPromise([previewContainer]).catch((err) => {
            console.error('MathJax 渲染错误:', err);
            console.log('渲染失败的 LaTeX:', cleanLatex);  // 添加调试信息
            previewContainer.innerHTML = '<span style="color: #dc3545;">公式渲染失败</span>';
          });
        }
      }, 100);

      // 设置超时，防止无限等待
      setTimeout(() => {
        clearInterval(checkMathJax);
        if (!window.MathJax || !window.MathJax.typesetPromise) {
          previewContainer.innerHTML = '<span style="color: #dc3545;">MathJax 加载失败</span>';
        }
      }, 5000);
    }
  } catch (error) {
    console.error('渲染错误:', error);
    console.log('出错的 LaTeX:', cleanLatex);  // 添加调试信息
    previewContainer.innerHTML = '<span style="color: #dc3545;">渲染失败</span>';
  }
}

function handleAnalysisResult(result) {
  if (result.success) {
    // 提取 LaTeX 部分
    const latexMatch = result.result.match(/## LaTeX 格式:\s*([\s\S]*?)(?=\n##|$)/);
    if (latexMatch) {
      currentLatex = latexMatch[1].trim();
    } else {
      currentLatex = result.result;  // 如果没有找到标记，使用整个结果
    }
    displayResult(currentLatex);
  } else {
    showStatus(result.error);
  }
}

// DOM 元素
const startCapture = document.getElementById('startCapture');
const imagePreview = document.getElementById('imagePreview');
const previewImage = document.getElementById('previewImage');
const fileInput = document.getElementById('fileInput');
const analyzeButton = document.getElementById('analyzeImage');
const clearButton = document.getElementById('clearImage');
const statusDiv = document.getElementById('status');

let currentImageData = null;  // 添加当前图片数据变量
let currentLatex = '';       // 添加当前LaTeX变量

// 工具函数
function showStatus(message, type = 'error') {
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  statusDiv.style.display = 'block';
  setTimeout(() => {
    statusDiv.style.display = 'none';
  }, 3000);
}

function enableAnalyzeButton() {
  analyzeButton.disabled = false;
}

function disableAnalyzeButton() {
  analyzeButton.disabled = true;
}

// 修改图片预览区域的点击事件
imagePreview.addEventListener('click', (e) => {
  console.log('Image preview clicked', e.target);
  if (e.target === clearButton) {
    console.log('Clear button clicked, ignoring upload trigger');
    return;
  }

  if (!previewImage.style.display || previewImage.style.display === 'none') {
    console.log('Triggering file input click');
    fileInput.click();
  }
});

// 确保文件输入的变更事件正确绑定
fileInput.addEventListener('change', (e) => {
  console.log('File input changed', e.target.files);
  const file = e.target.files[0];
  if (file) {
    console.log('Processing file:', file.name, file.type);
    handleImageFile(file);
  }
  fileInput.value = '';
});

// 处理图片文件的函数
function handleImageFile(file) {
  // 验证文件类型
  if (!file.type.startsWith('image/')) {
    showStatus('请选择图片文件');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    // 保存完整的 data URL
    const base64Data = e.target.result;
    currentImageData = base64Data;
    console.log('Image data length:', base64Data.length);  // 调试用
    showPreviewImage(e.target.result);
  };
  reader.onerror = () => {
    showStatus('读取文件失败');
  };
  reader.readAsDataURL(file);
}

// 显示预览图片
function showPreviewImage(src) {
  previewImage.src = src;
  previewImage.style.display = 'block';
  imagePreview.querySelector('.placeholder').style.display = 'none';
  clearButton.style.display = 'flex';
  enableAnalyzeButton();
}

// 清除图片
clearButton.addEventListener('click', (e) => {
  e.stopPropagation();  // 阻止事件冒泡
  previewImage.src = '';
  previewImage.style.display = 'none';
  imagePreview.querySelector('.placeholder').style.display = 'block';
  clearButton.style.display = 'none';
  currentImageData = null;
  disableAnalyzeButton();
});

// 分析按钮点击事件
analyzeButton.addEventListener('click', async () => {
  if (!currentImageData) {
    showStatus('请先选择或截取一张图片');
    return;
  }

  try {
    showStatus('正在分析图片...', 'info');

    // 确保发送完整的 data URL
    const imageData = currentImageData.startsWith('data:image/')
      ? currentImageData
      : `data:image/jpeg;base64,${currentImageData}`;

    // 发送消息到 background script
    const response = await chrome.runtime.sendMessage({
      type: 'ANALYZE_IMAGE',
      imageData: imageData
    });

    console.log('OCR 识别结果:', response);
    handleAnalysisResult(response);
  } catch (error) {
    console.error('分析失败:', error);
    showStatus('分析失败: ' + error.message);
  }
});

// 复制按钮点击事件
document.getElementById('copyLatex').addEventListener('click', async () => {
  const latexContent = document.getElementById('latexContent');
  if (!latexContent.textContent) {
    showStatus('没有可复制的内容');
    return;
  }

  try {
    // 提取纯 LaTeX 内容
    const latexText = latexContent.textContent
      .replace(/^```latex\s*/, '')  // 移除开头的 ```latex
      .replace(/\s*```$/, '')       // 移除结尾的 ```
      .trim();                      // 移除首尾空白

    await navigator.clipboard.writeText(latexText);
    showStatus('LaTeX 已复制到剪贴板', 'success');
  } catch (err) {
    console.error('复制失败:', err);
    // 降级方案：使用 background 脚本复制
    try {
      await chrome.runtime.sendMessage({
        type: 'COPY_TO_CLIPBOARD',
        text: latexText
      });
      showStatus('LaTeX 已复制到剪贴板', 'success');
    } catch (backgroundErr) {
      showStatus('复制失败，请手动复制', 'error');
    }
  }
});
