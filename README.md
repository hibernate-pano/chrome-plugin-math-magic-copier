# Math Magic Copier

一个强大的 Chrome 扩展，专门用于捕获网页上的数学公式并转换为 MathType 格式，方便粘贴到 Word 文档中。支持多种公式格式，包括 LaTeX、MathML 等。

## 主要特性

- 智能公式识别：支持多种格式的数学公式（LaTeX、MathML、图片等）
- 精确区域选择：自定义选择框实现精确的公式区域选择
- 实时预览：选择时实时显示选择区域和预览效果
- 高质量转换：使用先进的 AI 技术进行公式识别和转换
- 一键复制：直接复制为 MathType 格式，支持 Word 直接粘贴
- 多种输入方式：支持截图、文件上传等多种输入方式
- 智能压缩：自动优化图片质量，确保最佳识别效果

## 系统要求

- Chrome 浏览器 88.0 或更高版本
- Windows/Mac/Linux 系统
- 稳定的网络连接（用于 AI 识别）
- Word 2016 或更高版本（用于公式粘贴）

## 安装步骤

1. 下载项目代码
   ```bash
   git clone https://github.com/your-username/math-magic-copier.git
   ```

2. 打开 Chrome 扩展管理页面
   - 在地址栏输入：`chrome://extensions/`
   - 或者通过菜单：设置 -> 扩展程序

3. 启用开发者模式
   - 点击右上角的"开发者模式"开关

4. 加载扩展
   - 点击"加载已解压的扩展程序"
   - 选择项目目录

## 使用方法

### 方法一：截图模式

1. 点击浏览器工具栏中的扩展图标
2. 点击"开始截取公式"按钮
3. 在网页上用鼠标选择要捕获的公式区域
   - 选择时会显示实时预览
   - 可以调整选择框大小和位置
4. 点击工具栏中的"捕获"按钮
5. 等待 AI 识别和转换完成
6. 点击"复制"按钮将公式复制到剪贴板
7. 在 Word 中粘贴即可

### 方法二：文件上传

1. 点击扩展图标打开操作面板
2. 将公式图片拖放到上传区域，或点击选择文件
3. 等待 AI 识别和转换
4. 复制转换后的公式到 Word

## 支持的公式格式

- LaTeX 公式
- MathML 标记
- MathJax 渲染的公式
- 图片格式的公式（PNG、JPEG、SVG等）
- Word 公式
- 手写公式（需要清晰的图片）

## 高级功能

### 图片优化

- 自动优化图片大小和质量
- 支持大尺寸图片的智能压缩
- 保持最佳识别效果的同时优化性能

### 批量处理

- 支持同时选择多个公式
- 批量转换和复制
- 保持公式格式一致性

### 自定义设置

- 可调整识别精度
- 自定义快捷键
- 界面主题切换

## 常见问题

1. **公式识别不准确？**
   - 确保选择区域只包含公式
   - 避免背景干扰
   - 尝试调整选择区域大小

2. **复制到 Word 失败？**
   - 确保 Word 版本支持 MathType
   - 检查剪贴板权限
   - 尝试重新复制

3. **截图无法使用？**
   - 检查浏览器权限设置
   - 刷新页面后重试
   - 确保页面加载完成

## 技术支持

- 提交 Issue：[GitHub Issues](https://github.com/your-username/math-magic-copier/issues)
- 邮件支持：support@example.com
- 文档：[在线文档](https://docs.example.com)

## 开发者指南

### 本地开发

1. 安装依赖
   ```bash
   npm install
   ```

2. 启动开发服务器
   ```bash
   npm run dev
   ```

3. 构建生产版本
   ```bash
   npm run build
   ```

### 代码贡献

1. Fork 项目
2. 创建特性分支
3. 提交更改
4. 发起 Pull Request

## 更新日志

### v1.0.0 (2024-02-17)
- 初始版本发布
- 支持基本的公式识别和转换
- 实现截图和文件上传功能

## 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 致谢

- [MathJax](https://www.mathjax.org/)
- [html2canvas](https://html2canvas.hertzen.com/)
- [硅基流动 AI](https://www.siliconflow.com/)

---
Made with ❤️ by Math Magic Team
