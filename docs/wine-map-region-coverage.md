# 饮酒足迹产区地图覆盖审计

## 数据来源与匹配规则

- `prototype/src/lib/wineMapCatalog.ts`：19 个国家、131 个一级产区的稳定 ID、中英文名、已审核别名、层级、来源与状态。
- `prototype/src/lib/mapLayers.ts`：首屏国家、放大国家、记录解析、unresolved 聚合与层级阈值。
- `prototype/src/Prototype.tsx`：酒款录入国家/产区目录（本次将其缺失的一级产区补入地图目录）。
- `prototype/src/lib/tastingRecords.ts`：用户记录字段 `country` / `region`；记录数量只在运行时聚合，不写入静态地理配置。
- `prototype/public/assets/maps/` 与 `output/prototype/public/assets/maps/`：世界图、6 个既有国家插画地图和 13 个新增国家轮廓图。新增轮廓由 Natural Earth 衍生的 [`datasets/geo-countries`](https://github.com/datasets/geo-countries) 数据生成，构建脚本为 `prototype/scripts/generate-country-map-assets.mjs`；源 GeoJSON 不进入主包。

解析顺序为稳定目录 ID → 中文标准名 → 英文名/已审核别名。无法精确匹配的产区不会被丢弃，而是归入对应国家的“其他产区”，其状态为 `unresolved`。未发现可靠边界或中心点时不生成坐标；当前国家插画仍作为既有视觉资源，不被当作精确边界。

## 审计缺失清单

- 已有地图：世界、法国、意大利、中国、美国、澳大利亚、新西兰。
- 原缺少国家地图：西班牙、德国、葡萄牙、智利、阿根廷、南非、奥地利、匈牙利、希腊、加拿大、格鲁吉亚、日本、乌拉圭；现已补齐可追踪来源的 SVG 国家轮廓。
- 名称不一致：英文重音与无重音写法共 8 组，均通过明确别名处理；没有使用中文相似度合并。
- 无法确定父级国家：运行时归入“国家未确定”，原始产区值进入 unresolved。
- 缺少可靠产区坐标或边界：131 个一级产区均没有仓库内可验证的精确空间资源，因此以目录列表呈现，不生成地图点或轮廓。
- 重复产区名称：目录内没有同一国家下的重复标准名；跨国家同名依靠 `parentId + countryCode` 区分。
- 历史别名：Rias Baixas、Dao、Setubal、Limari Valley、Curico Valley、Bio Bio Valley、Villany、Somlo。

## 覆盖统计

- 已有首屏国家：6；放大国家目录：13；产品支持国家总数：19。
- 地图产区目录：原有地图配置 60 个一级产区，补齐录入目录中的 71 个新增一级产区，合计 131 个（去重后）。
- 新增国家：0（已有支持国家全部纳入层级目录）。
- 新增产区：71。
- 有国家边界的国家：19；有可靠边界的产区：0（未伪造产区边界）。
- 仅有中心点：0（未把插画锚点冒充地理中心）。
- `approximate`：131 个目录产区（用于没有边界/中心点的目录级展示）。
- `unresolved`：运行时仅对实际出现且无法精确匹配的记录创建；静态配置不预先制造 unresolved 项。

## 名称与别名

完整中英文映射表位于 `prototype/src/lib/wineMapCatalog.ts`，覆盖全部 19 个国家和 131 个产区。历史无重音别名包括 Rias Baixas、Dao、Setubal、Limari Valley、Curico Valley、Bio Bio Valley、Villany、Somlo。解析使用统一去空白/标点/重音键，但不会使用中文相似度或编辑距离做模糊合并。

## 未解决数据清单

交付时仓库内没有用户历史数据快照，因此静态未解决值为 0 条可枚举记录。运行时未成功匹配的原始值会保存在每个国家聚合对象的 `unresolved` Map 中，并在国家页显示“待核实产区”清单；对应记录归入“其他产区”并可打开。缺少父级国家的记录归入“国家未确定”，不会丢弃。

## 缩放层级

- Level 1：`1.0–<1.6`，完全保留原 6 国、位置、标签、颜色、中心与交互。
- Level 2：`1.6–<2.2`，显示有记录国家及首批其他国家；`2.2` 起显示全部配置的放大国家。
- Level 3：`2.6–<4.0`，进入国家级一级产区目录，记录过的产区点亮并显示数量。
- Level 4：`4.0–6.0`，显示所选产区的记录列表；没有可靠边界时不绘制伪造轮廓。

## 性能与回归

地理配置为本地静态模块，记录数量独立聚合；缩放更新使用 `requestAnimationFrame` 合帧，世界层标签使用碰撞放置并保留隐藏标签的“更多国家”入口。国家页只渲染当前国家的目录和记录。13 个新增 SVG 合计约 232 KB，全部地图资源约 736 KB；高精度源 GeoJSON 不进入主包。国家地图上不再使用循环百分比伪造产区点位，无可靠中心点的产区改在地图下方列表展示。

回归结果：TypeScript 类型检查通过；移动运行时完整性检查通过；Node 单元/打包测试 13/13 通过；Playwright 运行时回归 8/8 通过；地图视觉验收 1/1 通过；Vite 生产构建通过。截图位于 `docs/evidence/wine-map-level-1.png`、`wine-map-level-2.png` 和 `wine-map-level-3-spain.png`。
