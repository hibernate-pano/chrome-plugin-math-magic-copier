let isCapturing = false;
let overlay = null;
let selection = null;
let toolbar = null;
let startX = 0;
let startY = 0;
let isDrawing = false;

// 全局变量，用于存储最后的选区信息
let lastSelectionRect = null;

// 创建选择框
function createSelection() {
  selection = document.createElement('div');
  selection.className = 'math-magic-selection';
  document.body.appendChild(selection);
}

// 创建工具栏
function createToolbar() {
  toolbar = document.createElement('div');
  toolbar.className = 'math-magic-toolbar';
  toolbar.style.position = 'fixed';
  toolbar.style.display = 'none';
  toolbar.style.zIndex = '2000000';
  toolbar.style.background = '#fff';
  toolbar.style.border = '1px solid #ccc';
  toolbar.style.borderRadius = '4px';
  toolbar.style.padding = '5px 10px';
  toolbar.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';

  const captureBtn = document.createElement('button');
  captureBtn.textContent = '捕获';
  captureBtn.className = 'math-magic-button capture';
  captureBtn.style.marginRight = '10px';
  captureBtn.style.padding = '5px 15px';
  captureBtn.style.border = 'none';
  captureBtn.style.borderRadius = '3px';
  captureBtn.style.background = '#4CAF50';
  captureBtn.style.color = 'white';
  captureBtn.style.cursor = 'pointer';

  // 修改捕获按钮的事件处理
  captureBtn.addEventListener('click', async (e) => {
    console.log('【DEBUG】Capture button clicked');
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    // 使用存储的选区信息
    if (!lastSelectionRect) {
      console.error('【DEBUG】No selection information found');
      alert('请先选择要截图的区域');
      return;
    }

    const { width, height } = lastSelectionRect;
    console.log('【DEBUG】Using stored selection:', lastSelectionRect);

    // 检查选区大小
    if (!width || !height || width < 15 || height < 15) {
      console.log('【DEBUG】Selection too small:', { width, height });
      alert('请选择一个合适的区域（最小15x15像素）');
      return;
    }

    if (width > 4096 || height > 4096) {
      console.log('【DEBUG】Selection too large:', { width, height });
      alert('选择区域太大，请缩小范围（最大4096x4096像素）');
      return;
    }

    try {
      // 检查html2canvas是否加载
      if (typeof html2canvas === 'undefined') {
        console.error('【DEBUG】html2canvas not loaded');
        throw new Error('截图组件未加载，请刷新页面重试');
      }

      // 禁用按钮，防止重复点击
      captureBtn.disabled = true;
      cancelBtn.disabled = true;
      captureBtn.textContent = '正在捕获...';

      console.log('【DEBUG】Starting capture process');
      await captureArea(lastSelectionRect);
      console.log('【DEBUG】Capture completed successfully');
    } catch (error) {
      console.error('【DEBUG】Capture failed:', error);
      alert('捕获失败: ' + (error.message || '未知错误，请重试'));
    } finally {
      console.log('【DEBUG】Cleanup in finally block');
      // 先移除事件监听器，防止触发新的选择
      document.removeEventListener('mousedown', handleMouseDown, true);
      document.removeEventListener('mousemove', handleMouseMove, true);
      document.removeEventListener('mouseup', handleMouseUp, true);

      // 清理UI
      if (overlay) {
        console.log('【DEBUG】Removing overlay');
        overlay.remove();
        overlay = null;
      }
      if (selection) {
        console.log('【DEBUG】Removing selection');
        selection.remove();
        selection = null;
      }
      if (toolbar) {
        console.log('【DEBUG】Removing toolbar');
        toolbar.remove();
        toolbar = null;
      }

      // 恢复页面选中
      document.body.style.userSelect = '';
      isCapturing = false;
      isDrawing = false;
      console.log('【DEBUG】Cleanup completed');
    }
  });

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = '取消';
  cancelBtn.className = 'math-magic-button cancel';
  cancelBtn.style.padding = '5px 15px';
  cancelBtn.style.border = 'none';
  cancelBtn.style.borderRadius = '3px';
  cancelBtn.style.background = '#f44336';
  cancelBtn.style.color = 'white';
  cancelBtn.style.cursor = 'pointer';

  cancelBtn.addEventListener('click', (e) => {
    console.log('【DEBUG】Cancel button clicked');
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    endCapture();
  });

  toolbar.appendChild(captureBtn);
  toolbar.appendChild(cancelBtn);
  document.body.appendChild(toolbar);
  return toolbar;
}

// 创建悬浮层
function createOverlay() {
  overlay = document.createElement('div');
  overlay.className = 'math-magic-overlay';

  // 添加点击事件处理，如果点击的是工具栏则不处理
  overlay.addEventListener('mousedown', (e) => {
    if (toolbar && toolbar.contains(e.target)) {
      e.stopPropagation();
      return;
    }
  });

  document.body.appendChild(overlay);
}

// 更新选择框位置和大小
function updateSelection(e) {
  if (!isDrawing || !selection) return;

  const currentX = e.clientX;
  const currentY = e.clientY;

  // 计算实际宽度和高度
  const width = Math.abs(currentX - startX);
  const height = Math.abs(currentY - startY);

  // 计算左上角位置
  const left = Math.min(currentX, startX);
  const top = Math.min(currentY, startY);

  // 设置选择框样式
  selection.style.left = `${left}px`;
  selection.style.top = `${top}px`;
  selection.style.width = `${width}px`;
  selection.style.height = `${height}px`;
  selection.style.display = 'block';

  // 更新工具栏位置
  if (toolbar) {
    toolbar.style.display = 'flex';
    toolbar.style.left = `${left + width + 5}px`;
    toolbar.style.top = `${top}px`;
  }

  // 调试信息
  console.log('Selection updated:', {
    width,
    height,
    left,
    top,
    currentX,
    currentY,
    startX,
    startY
  });
}

// 压缩图片
async function compressImage(base64Data) {
  // 计算base64字符串对应的文件大小（以字节为单位）
  function getBase64Size(base64String) {
    const base64WithoutHeader = base64String.split(',')[1] || base64String;
    return Math.ceil((base64WithoutHeader.length * 3) / 4);
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let quality = 0.9; // 提高初始质量
      let maxSize = 4000; // 提高最大尺寸到接近4096

      // 检查是否为 SVG 格式
      const isSVG = base64Data.startsWith('data:image/svg+xml');
      if (isSVG) {
        // 对于 SVG，我们直接转换为高质量的 PNG
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // 使用较大的尺寸以保持清晰度
        canvas.width = Math.min(img.width * 2, 4000);
        canvas.height = Math.min(img.height * 2, 4000);
        
        // 使用白色背景
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 绘制 SVG
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // 转换为高质量 PNG
        const pngData = canvas.toDataURL('image/png', 1.0);
        resolve(pngData.split(',')[1]);
        return;
      }

      let compressedBase64;

      // 创建一个函数来尝试压缩
      function tryCompress(currentQuality, currentMaxSize) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // 计算新的尺寸，保持宽高比
        let width = img.width;
        let height = img.height;

        // 确保最短边不小于15px
        const minSide = Math.min(width, height);
        if (minSide < 15) {
          const scale = 15 / minSide;
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }

        // 限制最长边不超过maxSize
        const maxSide = Math.max(width, height);
        if (maxSide > currentMaxSize) {
          const scale = currentMaxSize / maxSide;
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }

        canvas.width = width;
        canvas.height = height;

        // 绘制压缩后的图片
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // 转换为base64，使用jpeg格式
        const base64 = canvas.toDataURL('image/jpeg', currentQuality);
        return base64.split(',')[1]; // 只返回base64数据部分
      }

      // 循环尝试压缩直到大小合适
      do {
        compressedBase64 = tryCompress(quality, maxSize);
        const currentSize = getBase64Size(compressedBase64);

        // 考虑urlencode后的大小会增加约30%
        const urlEncodedSize = currentSize * 1.3;

        if (urlEncodedSize <= 8 * 1024 * 1024) { // 提高到8MB限制
          break;
        }

        // 如果还是太大，降低质量和尺寸
        if (quality > 0.3) { // 降低最小质量限制
          quality -= 0.1; // 更平缓的质量降低
        } else {
          maxSize = Math.round(maxSize * 0.8);
          quality = 0.6; // 重置到更高的质量
        }
      } while (maxSize > 15); // 确保最小边不小于15px

      resolve(compressedBase64);
    };
    img.src = base64Data;
  });
}

// 捕获选中区域
async function captureArea(selectionRect) {
  let loadingOverlay = null;

  try {
    // 显示加载遮罩
    loadingOverlay = document.createElement('div');
    loadingOverlay.style.position = 'fixed';
    loadingOverlay.style.top = '0';
    loadingOverlay.style.left = '0';
    loadingOverlay.style.width = '100%';
    loadingOverlay.style.height = '100%';
    loadingOverlay.style.background = 'rgba(0, 0, 0, 0.5)';
    loadingOverlay.style.zIndex = '999999';
    loadingOverlay.style.display = 'flex';
    loadingOverlay.style.alignItems = 'center';
    loadingOverlay.style.justifyContent = 'center';
    loadingOverlay.style.color = 'white';
    loadingOverlay.style.fontSize = '20px';
    document.body.appendChild(loadingOverlay);

    const updateLoadingText = (text) => {
      if (loadingOverlay) {
        loadingOverlay.textContent = text;
      }
    };

    updateLoadingText('正在准备截图...');
    console.log('Starting capture area with rect:', selectionRect);

    // 检查html2canvas
    if (typeof html2canvas === 'undefined') {
      console.error('html2canvas is not loaded');
      throw new Error('截图组件未加载，请刷新页面重试');
    }

    const { width, height, left, top } = selectionRect;

    // 直接截取整个窗口
    const canvas = await html2canvas(document.documentElement, {
      logging: true,
      useCORS: true,
      allowTaint: true,
      backgroundColor: 'white',
      scale: 2,
      x: window.scrollX + left,
      y: window.scrollY + top,
      width: width,
      height: height,
      scrollX: -window.scrollX - left,
      scrollY: -window.scrollY - top,
      windowWidth: document.documentElement.scrollWidth,
      windowHeight: document.documentElement.scrollHeight,
      foreignObjectRendering: false,
      removeContainer: true,
      ignoreElements: (element) => {
        // 忽略所有图片、iframe、视频等外部资源
        const tagName = element.tagName.toLowerCase();
        if (['img', 'iframe', 'video', 'embed', 'object', 'picture'].includes(tagName)) {
          return true;
        }
        // 忽略所有背景图片
        const style = window.getComputedStyle(element);
        return style.backgroundImage !== 'none';
      },
      onclone: function (clonedDoc) {
        console.log('Document cloned successfully');
        // 移除所有我们的UI元素和外部资源
        const elements = clonedDoc.querySelectorAll(
          '.math-magic-toolbar, .math-magic-overlay, .math-magic-selection, ' +
          'img, iframe, video, embed, object, picture'
        );
        elements.forEach(el => el.remove());

        // 移除所有背景图片
        const allElements = clonedDoc.getElementsByTagName('*');
        for (let element of allElements) {
          element.style.backgroundImage = 'none';
        }
      }
    });

    console.log('html2canvas completed');
    updateLoadingText('正在压缩图片...');

    // 转换为base64图片数据
    const imageData = canvas.toDataURL('image/jpeg', 0.95);
    console.log('Image captured, size:', imageData.length);

    // 压缩图片
    const compressedImage = await compressImage(imageData);
    console.log('Image compressed, size:', compressedImage.length);

    // 发送到 popup
    chrome.runtime.sendMessage({
      type: 'CAPTURE_COMPLETE',
      imageData: compressedImage
    });

    // 不再自动发送到后台进行分析
    return true;

  } catch (error) {
    console.error('截图失败:', error);
    throw error;
  } finally {
    // 清理加载遮罩
    if (loadingOverlay && loadingOverlay.parentNode) {
      loadingOverlay.remove();
    }
  }
}

// 开始捕获模式
function startCapture() {
  console.log('Starting capture mode...');

  isCapturing = true;
  isDrawing = false;

  // 创建必要的元素
  if (!overlay) createOverlay();
  if (!selection) createSelection();
  if (!toolbar) createToolbar();

  // 重置元素状态
  selection.style.width = '0';
  selection.style.height = '0';
  selection.style.display = 'none';
  toolbar.style.display = 'none';

  // 设置overlay样式
  overlay.style.display = 'block';
  overlay.style.cursor = 'crosshair';

  // 添加事件监听器
  document.addEventListener('mousedown', handleMouseDown, true);
  document.addEventListener('mousemove', handleMouseMove, true);
  document.addEventListener('mouseup', handleMouseUp, true);

  // 防止页面选中
  document.body.style.userSelect = 'none';

  console.log('Capture mode started, waiting for user selection...');
}

// 结束捕获模式
function endCapture() {
  console.log('Ending capture mode...');

  isCapturing = false;
  isDrawing = false;

  // 移除事件监听器
  document.removeEventListener('mousedown', handleMouseDown, true);
  document.removeEventListener('mousemove', handleMouseMove, true);
  document.removeEventListener('mouseup', handleMouseUp, true);

  // 恢复页面选中
  document.body.style.userSelect = '';

  // 清理DOM元素
  if (overlay) {
    overlay.remove();
    overlay = null;
  }
  if (selection) {
    selection.remove();
    selection = null;
  }
  if (toolbar) {
    toolbar.remove();
    toolbar = null;
  }

  console.log('Capture mode ended');
}

// 处理鼠标事件
function handleMouseDown(e) {
  console.log('【DEBUG】Mouse down event:', {
    target: e.target.tagName,
    isToolbarButton: e.target.classList.contains('math-magic-button'),
    isCapturing,
    isDrawing
  });

  if (!isCapturing) return;

  // 如果点击的是工具栏按钮，不处理
  if (e.target.classList.contains('math-magic-button')) {
    console.log('【DEBUG】Clicked on toolbar button, ignoring');
    return;
  }

  isDrawing = true;
  startX = e.clientX;
  startY = e.clientY;
  console.log('【DEBUG】Starting draw:', { startX, startY });

  if (selection) {
    selection.style.display = 'block';
    selection.style.left = `${startX}px`;
    selection.style.top = `${startY}px`;
    selection.style.width = '0';
    selection.style.height = '0';
  }

  if (toolbar) {
    toolbar.style.display = 'none';
  }

  e.preventDefault();
  e.stopPropagation();
}

function handleMouseMove(e) {
  if (!isCapturing || !isDrawing) return;

  // 防止事件冒泡和默认行为
  e.preventDefault();
  e.stopPropagation();

  // 更新选择框
  updateSelection(e);
}

function handleMouseUp(e) {
  console.log('【DEBUG】Mouse up event:', {
    target: e.target.tagName,
    isToolbarButton: e.target.classList.contains('math-magic-button'),
    isDrawing,
    isCapturing
  });

  if (!isDrawing) {
    console.log('【DEBUG】Not drawing, ignoring mouse up');
    return;
  }

  // 如果点击的是工具栏按钮，不处理
  if (e.target.classList.contains('math-magic-button')) {
    console.log('【DEBUG】Clicked on toolbar button, ignoring');
    e.stopPropagation();
    return;
  }

  isDrawing = false;

  // 计算选择框的最终尺寸
  const currentX = e.clientX;
  const currentY = e.clientY;
  const width = Math.abs(currentX - startX);
  const height = Math.abs(currentY - startY);
  const left = Math.min(currentX, startX);
  const top = Math.min(currentY, startY);

  console.log('【DEBUG】Final selection calculated:', { width, height, left, top });

  // 更新选择框位置和尺寸
  selection.style.left = `${left}px`;
  selection.style.top = `${top}px`;
  selection.style.width = `${width}px`;
  selection.style.height = `${height}px`;

  // 存储选区信息
  lastSelectionRect = {
    width,
    height,
    left,
    top,
    right: left + width,
    bottom: top + height
  };
  console.log('【DEBUG】Selection stored:', lastSelectionRect);

  // 如果选择框太小，不显示工具栏
  if (width < 15 || height < 15) {
    console.log('【DEBUG】Selection too small, hiding toolbar');
    if (toolbar) toolbar.style.display = 'none';
    return;
  }

  // 显示工具栏
  if (toolbar) {
    toolbar.style.display = 'block';
    let toolbarLeft = left + width + 5;
    const toolbarRect = toolbar.getBoundingClientRect();

    if (toolbarLeft + toolbarRect.width > window.innerWidth) {
      toolbarLeft = window.innerWidth - toolbarRect.width - 5;
    }

    toolbar.style.left = toolbarLeft + 'px';
    toolbar.style.top = top + 'px';
    console.log('【DEBUG】Toolbar positioned at:', { left: toolbarLeft, top });
  }

  e.preventDefault();
  e.stopPropagation();
}

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'START_CAPTURE') {
    startCapture();
    sendResponse({ success: true });
  }
  return true;
});
