// 确保全局变量只声明一次
if (typeof window.mathMagicInitialized === 'undefined') {
  // 全局变量声明
  window.mathMagicOverlay = null;
  window.mathMagicSelection = null;
  window.mathMagicToolbar = null;
  window.mathMagicStartX = 0;
  window.mathMagicStartY = 0;
  window.mathMagicIsDrawing = false;
  window.mathMagicLastSelectionRect = null;
  window.isCapturing = false;

  // 标记脚本已初始化
  window.mathMagicInitialized = true;
  console.log('Math Magic Copier: 脚本初始化');
}

// 使用简化的变量名以便于代码可读性
let overlay = window.mathMagicOverlay,
  selection = window.mathMagicSelection,
  toolbar = window.mathMagicToolbar,
  startX = window.mathMagicStartX,
  startY = window.mathMagicStartY,
  isDrawing = window.mathMagicIsDrawing,
  lastSelectionRect = window.mathMagicLastSelectionRect;

// 创建选择框
function createSelection() {
  selection = document.createElement('div');
  selection.className = 'math-magic-selection';

  // 设置选择框样式
  selection.style.position = 'fixed';
  selection.style.border = '2px solid #1a73e8';
  selection.style.backgroundColor = 'rgba(26, 115, 232, 0.1)';
  selection.style.zIndex = '999999';
  selection.style.pointerEvents = 'none';
  selection.style.display = 'none';
  selection.style.boxSizing = 'border-box';

  document.body.appendChild(selection);

  // 更新全局变量
  window.mathMagicSelection = selection;
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
        window.mathMagicOverlay = null;
      }
      if (selection) {
        console.log('【DEBUG】Removing selection');
        selection.remove();
        selection = null;
        window.mathMagicSelection = null;
      }
      if (toolbar) {
        console.log('【DEBUG】Removing toolbar');
        toolbar.remove();
        toolbar = null;
        window.mathMagicToolbar = null;
      }

      // 恢复页面选中
      document.body.style.userSelect = '';
      window.isCapturing = false;
      isDrawing = false;
      window.mathMagicIsDrawing = false;
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

  // 更新全局变量
  window.mathMagicToolbar = toolbar;

  return toolbar;
}

// 创建悬浮层
function createOverlay() {
  overlay = document.createElement('div');
  overlay.className = 'math-magic-overlay';

  // 设置遮罩层样式
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.background = 'rgba(0, 0, 0, 0.1)';  // 改为半透明
  overlay.style.zIndex = '999998';  // 确保在其他元素之上
  overlay.style.pointerEvents = 'auto';  // 允许点击事件

  // 添加点击事件处理，如果点击的是工具栏则不处理
  overlay.addEventListener('mousedown', (e) => {
    if (toolbar && toolbar.contains(e.target)) {
      e.stopPropagation();
      return;
    }
  });

  document.body.appendChild(overlay);

  // 更新全局变量
  window.mathMagicOverlay = overlay;
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
  console.log('开始压缩图片，原始数据长度:', base64Data.length);

  // 如果数据已经是完整的 data URL，则直接返回
  if (base64Data.startsWith('data:image/')) {
    console.log('图片数据已经是 data URL 格式');
    return base64Data;
  }

  // 计算base64字符串对应的文件大小（以字节为单位）
  function getBase64Size(base64String) {
    const base64WithoutHeader = base64String.split(',')[1] || base64String;
    return Math.ceil((base64WithoutHeader.length * 3) / 4);
  }

  return new Promise((resolve) => {
    const img = new Image();

    img.onload = () => {
      console.log('图片加载成功，尺寸:', img.width, 'x', img.height);
      let quality = 0.9; // 提高初始质量
      let maxSize = 4000; // 提高最大尺寸到接近4096

      // 检查是否为 SVG 格式
      const isSVG = base64Data.startsWith('data:image/svg+xml');
      if (isSVG) {
        console.log('处理 SVG 格式图片');
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
        console.log('SVG 转换为 PNG 成功，数据长度:', pngData.length);
        resolve(pngData);
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

        // 转换为base64，使用PNG格式以保持质量
        const base64 = canvas.toDataURL('image/png', currentQuality);
        return base64; // 返回完整的 data URL
      }

      // 循环尝试压缩直到大小合适
      do {
        compressedBase64 = tryCompress(quality, maxSize);
        const currentSize = compressedBase64.length;
        console.log('尝试压缩，质量:', quality, '尺寸上限:', maxSize, '结果大小:', currentSize);

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

      console.log('压缩完成，最终数据长度:', compressedBase64.length);
      resolve(compressedBase64);
    };

    img.onerror = (error) => {
      console.error('图片加载失败:', error);
      // 如果加载失败，返回原始数据
      resolve('data:image/png;base64,' + base64Data);
    };

    // 确保数据是完整的 data URL
    if (base64Data.startsWith('data:image/')) {
      img.src = base64Data;
    } else {
      img.src = 'data:image/png;base64,' + base64Data;
    }
  });
}

// 捕获选中区域 - 完全重构版本
async function captureArea(selectionRect) {
  let loadingUI = null;

  try {
    console.log('开始截图，选区信息:', selectionRect);
    let { width, height, left, top } = selectionRect;

    // 验证选区大小
    if (width < 10 || height < 10) {
      throw new Error('选区太小，无法截图');
    }

    // 临时隐藏遮罩层和工具栏
    if (overlay) overlay.style.display = 'none';
    if (toolbar) toolbar.style.display = 'none';
    if (selection) selection.style.display = 'none';

    // 创建加载UI
    loadingUI = document.createElement('div');
    loadingUI.style.position = 'fixed';
    loadingUI.style.top = '50%';
    loadingUI.style.left = '50%';
    loadingUI.style.transform = 'translate(-50%, -50%)';
    loadingUI.style.background = 'rgba(0, 0, 0, 0.8)';
    loadingUI.style.color = '#ffffff';
    loadingUI.style.padding = '20px 40px';
    loadingUI.style.borderRadius = '8px';
    loadingUI.style.zIndex = '2100000';
    loadingUI.style.fontSize = '16px';
    loadingUI.textContent = '正在截图...';
    document.body.appendChild(loadingUI);

    // 等待一下，确保 UI 已经隐藏
    await new Promise(resolve => setTimeout(resolve, 300));

    // 创建一个临时元素来定位选区
    const targetElement = document.createElement('div');
    targetElement.style.position = 'absolute';
    targetElement.style.left = left + 'px';
    targetElement.style.top = top + 'px';
    targetElement.style.width = width + 'px';
    targetElement.style.height = height + 'px';
    targetElement.style.zIndex = '-1';
    targetElement.style.pointerEvents = 'none';
    targetElement.style.backgroundColor = 'transparent';
    document.body.appendChild(targetElement);

    console.log('直接使用 html2canvas 截取选区');

    // 考虑设备像素比
    const pixelRatio = window.devicePixelRatio || 1;

    // 使用 html2canvas 直接截取选区
    const canvas = await html2canvas(targetElement, {
      backgroundColor: null,
      scale: pixelRatio,
      logging: true,
      useCORS: true,
      allowTaint: true,
      ignoreElements: (element) => {
        // 忽略我们的UI元素
        return element === overlay ||
          element === toolbar ||
          element === selection ||
          element === loadingUI ||
          element === targetElement;
      }
    });

    // 移除临时元素
    targetElement.remove();

    // 转换为数据 URL
    const imageData = canvas.toDataURL('image/png');
    console.log('截图成功，图片数据长度:', imageData.length);

    // 压缩图片
    const compressedImage = await compressImage(imageData);
    console.log('压缩后图片数据长度:', compressedImage.length);

    // 发送截图数据
    chrome.runtime.sendMessage({
      type: 'CAPTURE_COMPLETE',
      imageData: compressedImage
    });

    console.log('截图数据已发送到 background');
    return true;

  } catch (error) {
    console.error('截图失败:', error);
    chrome.runtime.sendMessage({
      type: 'CAPTURE_COMPLETE',
      error: error.message
    });
    throw error;
  } finally {
    // 恢复遮罩层和工具栏
    if (overlay) overlay.style.display = 'block';
    if (toolbar) toolbar.style.display = 'block';
    if (selection) selection.style.display = 'block';

    if (loadingUI) loadingUI.remove();
  }
}

// 开始捕获模式
function startCapture() {
  console.log('Starting capture mode...');

  if (window.isCapturing) {
    console.log('Already in capture mode');
    return;
  }

  window.isCapturing = true;
  isDrawing = false;
  window.mathMagicIsDrawing = false;

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
  document.addEventListener('keydown', handleKeyDown, true); // 添加键盘事件监听

  // 防止页面选中
  document.body.style.userSelect = 'none';

  console.log('Capture mode started, waiting for user selection...');
}

// 处理键盘事件
function handleKeyDown(e) {
  // 如果按下 ESC 键，退出截图模式
  if (e.key === 'Escape') {
    console.log('【DEBUG】ESC key pressed, exiting capture mode');
    e.preventDefault();
    e.stopPropagation();
    endCapture();
  }
}

// 结束捕获模式
function endCapture() {
  console.log('Ending capture mode...');

  window.isCapturing = false;
  isDrawing = false;
  window.mathMagicIsDrawing = false;

  // 移除事件监听器
  document.removeEventListener('mousedown', handleMouseDown, true);
  document.removeEventListener('mousemove', handleMouseMove, true);
  document.removeEventListener('mouseup', handleMouseUp, true);
  document.removeEventListener('keydown', handleKeyDown, true); // 移除键盘事件监听

  // 恢复页面选中
  document.body.style.userSelect = '';

  // 清理DOM元素
  if (overlay) {
    overlay.remove();
    overlay = null;
    window.mathMagicOverlay = null;
  }
  if (selection) {
    selection.remove();
    selection = null;
    window.mathMagicSelection = null;
  }
  if (toolbar) {
    toolbar.remove();
    toolbar = null;
    window.mathMagicToolbar = null;
  }

  console.log('Capture mode ended');
}

// 处理鼠标事件
function handleMouseDown(e) {
  console.log('【DEBUG】Mouse down event:', {
    target: e.target.tagName,
    isToolbarButton: e.target.classList.contains('math-magic-button'),
    isCapturing: window.isCapturing,
    isDrawing
  });

  if (!window.isCapturing) return;

  // 如果点击的是工具栏按钮，不处理
  if (e.target.classList.contains('math-magic-button')) {
    console.log('【DEBUG】Clicked on toolbar button, ignoring');
    return;
  }

  isDrawing = true;
  window.mathMagicIsDrawing = true;
  startX = e.clientX;
  startY = e.clientY;
  window.mathMagicStartX = startX;
  window.mathMagicStartY = startY;
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
  if (!window.isCapturing || !isDrawing) return;

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
    isCapturing: window.isCapturing
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
  window.mathMagicIsDrawing = false;

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
  window.mathMagicLastSelectionRect = lastSelectionRect;
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

// 创建分析加载动画
function createAnalysisLoading() {
  const container = document.createElement('div');
  container.className = 'math-magic-result-container';
  container.style.position = 'fixed';
  container.style.right = '24px';
  container.style.top = '24px';
  container.style.width = '360px';
  container.style.background = '#ffffff';
  container.style.borderRadius = '12px';
  container.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.12)';
  container.style.zIndex = '2100000';
  container.style.overflow = 'hidden';
  container.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
  container.style.opacity = '0';
  container.style.transform = 'translateY(-20px) scale(0.98)';
  container.style.backdropFilter = 'blur(8px)';
  container.style.webkitBackdropFilter = 'blur(8px)';

  // 创建头部
  const header = document.createElement('div');
  header.style.padding = '16px 20px';
  header.style.borderBottom = '1px solid rgba(0, 0, 0, 0.08)';
  header.style.display = 'flex';
  header.style.alignItems = 'center';
  header.style.justifyContent = 'space-between';
  header.style.background = 'rgba(255, 255, 255, 0.98)';

  const title = document.createElement('div');
  title.textContent = '识别结果';
  title.style.fontSize = '15px';
  title.style.fontWeight = '600';
  title.style.color = '#1f2937';
  title.style.letterSpacing = '0.3px';

  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '&times;';
  closeBtn.style.background = 'none';
  closeBtn.style.border = 'none';
  closeBtn.style.fontSize = '24px';
  closeBtn.style.color = '#6b7280';
  closeBtn.style.cursor = 'pointer';
  closeBtn.style.padding = '0 4px';
  closeBtn.style.lineHeight = '1';
  closeBtn.style.transition = 'all 0.2s ease';
  closeBtn.onmouseover = () => {
    closeBtn.style.color = '#000000';
    closeBtn.style.transform = 'scale(1.1)';
  };
  closeBtn.onmouseout = () => {
    closeBtn.style.color = '#6b7280';
    closeBtn.style.transform = 'scale(1)';
  };
  closeBtn.onclick = () => {
    container.style.opacity = '0';
    container.style.transform = 'translateY(-20px) scale(0.98)';
    setTimeout(() => container.remove(), 300);
  };

  header.appendChild(title);
  header.appendChild(closeBtn);

  // 创建内容区
  const content = document.createElement('div');
  content.className = 'math-magic-result-content';
  content.style.padding = '20px';

  // 创建加载动画
  const loadingWrapper = document.createElement('div');
  loadingWrapper.className = 'math-magic-loading-wrapper';
  loadingWrapper.style.display = 'flex';
  loadingWrapper.style.flexDirection = 'column';
  loadingWrapper.style.alignItems = 'center';
  loadingWrapper.style.gap = '16px';
  loadingWrapper.style.padding = '32px 0';

  const spinner = document.createElement('div');
  spinner.className = 'math-magic-spinner';
  spinner.style.width = '36px';
  spinner.style.height = '36px';
  spinner.style.border = '3px solid #f0f0f0';
  spinner.style.borderTop = '3px solid #3b82f6';
  spinner.style.borderRadius = '50%';
  spinner.style.animation = 'math-magic-spin 0.8s linear infinite';

  const loadingText = document.createElement('div');
  loadingText.textContent = '正在识别公式...';
  loadingText.style.fontSize = '14px';
  loadingText.style.color = '#6b7280';
  loadingText.style.fontWeight = '500';

  // 添加动画关键帧
  if (!document.querySelector('#math-magic-animations')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'math-magic-animations';
    styleSheet.textContent = `
      @keyframes math-magic-spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(styleSheet);
  }

  loadingWrapper.appendChild(spinner);
  loadingWrapper.appendChild(loadingText);
  content.appendChild(loadingWrapper);

  container.appendChild(header);
  container.appendChild(content);

  // 添加到页面并显示
  document.body.appendChild(container);
  requestAnimationFrame(() => {
    container.style.opacity = '1';
    container.style.transform = 'translateY(0) scale(1)';
  });

  return container;
}

// 更新结果内容
function updateAnalysisResult(container, result) {
  const content = container.querySelector('.math-magic-result-content');
  const loadingWrapper = content.querySelector('.math-magic-loading-wrapper');

  // 创建结果内容
  const resultWrapper = document.createElement('div');
  resultWrapper.className = 'math-magic-result-wrapper';
  resultWrapper.style.width = '100%';
  resultWrapper.style.opacity = '0';
  resultWrapper.style.transform = 'translateY(10px)';
  resultWrapper.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';

  // 解析结果 JSON
  try {
    const resultData = JSON.parse(result);

    // 创建 LaTeX 显示区域
    const latexContainer = document.createElement('div');
    latexContainer.style.padding = '16px';
    latexContainer.style.background = '#f8fafc';
    latexContainer.style.borderRadius = '8px';
    latexContainer.style.fontFamily = 'JetBrains Mono, Consolas, Monaco, monospace';
    latexContainer.style.fontSize = '13px';
    latexContainer.style.lineHeight = '1.6';
    latexContainer.style.color = '#334155';
    latexContainer.style.border = '1px solid #e2e8f0';
    latexContainer.style.wordBreak = 'break-all';
    latexContainer.style.marginBottom = '16px';
    latexContainer.style.boxShadow = 'inset 0 1px 2px rgba(0, 0, 0, 0.03)';
    latexContainer.style.whiteSpace = 'pre-wrap';
    latexContainer.textContent = resultData.latex || '';

    // 创建复制按钮
    const copyButton = document.createElement('button');
    copyButton.textContent = '复制 LaTeX 代码';
    copyButton.style.width = '100%';
    copyButton.style.background = '#3b82f6';
    copyButton.style.color = '#ffffff';
    copyButton.style.border = 'none';
    copyButton.style.borderRadius = '8px';
    copyButton.style.padding = '12px 24px';
    copyButton.style.cursor = 'pointer';
    copyButton.style.fontSize = '14px';
    copyButton.style.fontWeight = '500';
    copyButton.style.transition = 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)';
    copyButton.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
    copyButton.style.position = 'relative';
    copyButton.style.overflow = 'hidden';

    // 添加按钮悬停效果
    copyButton.onmouseover = () => {
      copyButton.style.background = '#2563eb';
      copyButton.style.transform = 'translateY(-1px)';
      copyButton.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
    };
    copyButton.onmouseout = () => {
      copyButton.style.background = '#3b82f6';
      copyButton.style.transform = 'translateY(0)';
      copyButton.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
    };

    // 添加复制功能
    copyButton.onclick = async () => {
      try {
        await navigator.clipboard.writeText(resultData.latex || '');
        const originalText = copyButton.textContent;
        copyButton.style.background = '#059669';
        copyButton.textContent = '复制成功 ✓';
        copyButton.style.pointerEvents = 'none';
        setTimeout(() => {
          copyButton.textContent = originalText;
          copyButton.style.background = '#3b82f6';
          copyButton.style.pointerEvents = 'auto';
        }, 2000);
      } catch (err) {
        console.error('复制失败:', err);
        copyButton.style.background = '#dc2626';
        copyButton.textContent = '复制失败';
        setTimeout(() => {
          copyButton.textContent = '复制 LaTeX 代码';
          copyButton.style.background = '#3b82f6';
        }, 2000);
      }
    };

    resultWrapper.appendChild(latexContainer);
    resultWrapper.appendChild(copyButton);
  } catch (error) {
    console.error('解析结果失败:', error);
    resultWrapper.textContent = '';
  }

  // 替换加载动画
  loadingWrapper.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
  loadingWrapper.style.opacity = '0';
  loadingWrapper.style.transform = 'translateY(-10px)';

  setTimeout(() => {
    loadingWrapper.remove();
    content.appendChild(resultWrapper);
    requestAnimationFrame(() => {
      resultWrapper.style.opacity = '1';
      resultWrapper.style.transform = 'translateY(0)';
    });
  }, 300);
}

// 修改消息监听器
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log("Content script received message:", message);

  if (message.type === "START_CAPTURE") {
    console.log("开始截图模式");
    startCapture();
    sendResponse({ success: true });
  } else if (message.type === "START_ANALYSIS") {
    console.log("开始分析公式");
    const container = createAnalysisLoading();
    sendResponse({ success: true, containerId: container.id });
  } else if (message.type === "END_ANALYSIS") {
    console.log("分析完成");
    const container = document.querySelector('.math-magic-result-container');
    hideAnalysisLoading(container, message.result || '');
    sendResponse({ success: true });
  }
  return true;  // 保持消息通道开放
});
