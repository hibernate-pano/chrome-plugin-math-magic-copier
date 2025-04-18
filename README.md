# Math Formula to MathType

一个强大的 Chrome 扩展，用于捕获网页上的数学公式并转换为 LaTeX 格式，支持复制到剪贴板。

## 主要特性

- 截图模式：精确选择网页上的公式区域
- 文件上传：支持图片文件上传识别
- 实时预览：选择时显示选择区域和预览效果
- LaTeX 转换：将公式转换为 LaTeX 格式
- 一键复制：直接复制 LaTeX 到剪贴板
- SVG 支持：自动转换 SVG 为 PNG 进行识别

## 技术实现

- 使用 html2canvas 进行网页截图
- 集成 MathJax 进行公式渲染
- 百度 AI 接口进行公式识别
- Chrome Manifest V3 规范开发

## 系统要求

- Chrome 浏览器 88.0 或更高版本
- 需要网络连接（用于 AI 识别）

## 安装步骤

1. 克隆项目代码
   ```bash
   git clone https://github.com/your-username/math-magic-copier.git
   cd math-magic-copier
   ```

2. 安装依赖
   ```bash
   npm install
   ```

3. 加载扩展
   - 打开 Chrome 扩展页面 (`chrome://extensions/`)
   - 启用开发者模式
   - 点击"加载已解压的扩展程序"
   - 选择项目目录

## 使用方法

### 截图模式

1. 点击扩展图标
2. 点击"截取数学公式"按钮
3. 在网页上选择公式区域
4. 等待识别完成
5. 点击"复制 LaTeX"按钮

### 文件上传

1. 点击扩展图标
2. 拖放图片到上传区域或点击选择文件
3. 等待识别完成
4. 点击"复制 LaTeX"按钮

## 开发指南

### 运行开发环境

```bash
npm run dev
```

### 构建生产版本

```bash
npm run build
```

## 依赖项

- html2canvas: 网页截图
- MathJax: 公式渲染
- 百度 AI: 公式识别

## 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件
