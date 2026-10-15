# recognizeWineLabel

CloudBase 普通事件云函数，调用腾讯云 `GeneralAccurateOCR` 识别葡萄酒酒标。

- 运行环境：Node.js 20
- 执行方法：`index.main`
- 内存：256 MB
- 执行超时：30 秒
- 需要开启公网访问
- 凭证优先读取仅具备 OCR 权限的 `WINE_OCR_SECRET_ID` / `WINE_OCR_SECRET_KEY` 环境变量；未配置时回退到云函数运行角色的临时凭证
- 请求参数：`{ "imageBase64": "..." }`

不要在代码或前端中写入永久 `SecretId` / `SecretKey`。若 CloudBase 控制台不能配置运行角色，请创建仅有 `ocr:GeneralAccurateOCR` 权限的专用 CAM 子账号，并只把密钥保存在云函数环境变量中。
