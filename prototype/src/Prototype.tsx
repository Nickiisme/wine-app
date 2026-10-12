import { useMemo, useState } from "react";
import { ArchiveIcon, BackpackIcon, BarChartIcon, BellIcon, ChatBubbleIcon, CheckCircledIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, ClockIcon, CubeIcon, DashboardIcon, GearIcon, HeartIcon, HomeIcon, IdCardIcon, PersonIcon, PlusIcon, QuestionMarkCircledIcon, ReaderIcon, ReloadIcon, SewingPinFilledIcon, SewingPinIcon, StarIcon } from "@radix-ui/react-icons";
import { MobileScroll } from "./mobile";

type Occasion = "steak" | "party" | "solo";

const occasions: Array<{ id: Occasion; title: string; subtitle: string; image: string }> = [
  { id: "steak", title: "今晚牛排", subtitle: "经典搭配", image: "/assets/wine/hero-steak-wine.png" },
  { id: "party", title: "周末聚会", subtitle: "多人分享", image: "/assets/wine/red-bordeaux.png" },
  { id: "solo", title: "一个人小酌", subtitle: "放松时刻", image: "/assets/wine/white-sauvignon.png" },
];

const recommendations = {
  steak: { eyebrow: "SOMMELIER PICKS", title: "为你推荐 · 今晚牛排的理想搭配", subtitle: "基于附近真实库存 · 由专业侍酒师精选" },
  party: { eyebrow: "WEEKEND SHARING", title: "周末聚会 · 好喝也好分享", subtitle: "本地酒商现货 · 明日送到聚会桌上" },
  solo: { eyebrow: "A QUIET GLASS", title: "一个人小酌 · 松弛但不将就", subtitle: "小份量也值得认真挑选 · 附近酒商精选" },
};

const wines = [
  { id: "lynch-bages", badge: "经典之选", name: "靓茨伯庄园 2020", origin: "法国  波雅克 · 1855 五级庄", notes: "黑加仑 ｜ 黑樱桃 ｜ 雪松 ｜ 单宁细腻", quote: "结构扎实，与牛排的鲜味相得益彰。", price: 899, original: "¥1,180", distance: "杭州·西湖 3.2km", image: "/assets/wine/red-bordeaux.png" },
  { id: "cloudy-bay", badge: "人气推荐", name: "云雾之湾 长相思 2024", origin: "新西兰  马尔堡", notes: "柑橘 ｜ 百香果 ｜ 青苹果 ｜ 清新爽脆", quote: "充满活力的果香，平衡油脂感。", price: 249, original: "¥320", distance: "杭州·西湖 2.6km", image: "/assets/wine/white-sauvignon.png" },
];

type OrdersScreenProps = { onRepeat: () => void; onNotice: (message: string) => void };

function OrdersScreen({ onRepeat, onNotice }: OrdersScreenProps) {
  const [filter, setFilter] = useState("all");
  return (
    <main className="sub-screen orders-screen" aria-label="我的订单">
      <header className="sub-header"><p>MY ORDERS</p><h1>我的订单</h1><button type="button" onClick={() => onNotice("没有新的系统消息")}><ChatBubbleIcon /></button></header>
      <div className="order-tabs" role="tablist" aria-label="订单筛选">
        {[{id:"all",label:"全部"},{id:"delivery",label:"配送中"},{id:"done",label:"已完成"},{id:"refund",label:"退款/售后"}].map((item) => <button type="button" role="tab" aria-selected={filter===item.id} className={filter===item.id?"active":""} onClick={() => setFilter(item.id)} key={item.id}>{item.label}</button>)}
      </div>

      {(filter === "all" || filter === "delivery") && <section className="active-order">
        <div className="order-heading"><span><ClockIcon /> 配送中</span><small>预计明天 14:00 前送达</small></div>
        <div className="delivery-progress" aria-label="配送进度">
          <div className="progress-line"><i className="done" /><i className="done" /><i /></div>
          <div className="progress-labels"><span>商家已接单<small>10月12日 18:24</small></span><span>待骑手取货<small>杭州·西湖仓</small></span><span>送达<small>明天</small></span></div>
        </div>
        <div className="order-product"><img src="/assets/wine/red-bordeaux.png" alt="靓茨伯庄园 2020" /><div><h2>靓茨伯庄园 2020</h2><p>法国·波雅克 · 750ml × 1</p><span>正品保障 · 恒温配送</span></div><strong>¥899</strong></div>
        <div className="order-meta"><span>订单号 202610120038</span><b>实付 ¥899</b></div>
        <div className="order-actions"><button type="button" onClick={() => onNotice("已为你联系配送骑手")}>联系配送</button><button type="button" className="primary" onClick={() => onNotice("配送轨迹已更新")}>查看物流</button></div>
      </section>}

      {(filter === "all" || filter === "done") && <section className="past-orders">
        <div className="list-title"><div><p>PAST ORDERS</p><h2>最近购买</h2></div><button type="button">查看全部 <ChevronRightIcon /></button></div>
        <article className="past-order"><img src="/assets/wine/white-sauvignon.png" alt="云雾之湾 长相思 2024" /><div><h3>云雾之湾 长相思 2024</h3><p>已于 10月6日送达</p><span>¥249 · 共1件</span></div><button type="button" onClick={onRepeat}><ReloadIcon /> 再来一单</button></article>
      </section>}

      {filter === "refund" && <section className="empty-state"><ArchiveIcon /><h2>暂无售后记录</h2><p>退款、退货及其他售后进度会显示在这里</p><button type="button" onClick={() => setFilter("all")}>查看全部订单</button></section>}
    </main>
  );
}

function ProfileScreen({ onNotice, onOpenSupplier }: { onNotice: (message: string) => void; onOpenSupplier: () => void }) {
  const quick = [
    { icon: <HeartIcon />, label: "我的收藏", value: "12" },
    { icon: <StarIcon />, label: "优惠券", value: "3张" },
    { icon: <SewingPinIcon />, label: "收货地址", value: "2个" },
  ];
  const services = [
    { icon: <IdCardIcon />, label: "实名认证", note: "已认证" },
    { icon: <ChatBubbleIcon />, label: "在线客服", note: "09:00–22:00" },
    { icon: <ReaderIcon />, label: "饮酒偏好", note: "赤霞珠 · 干型" },
    { icon: <QuestionMarkCircledIcon />, label: "帮助与反馈", note: "" },
    { icon: <GearIcon />, label: "设置", note: "" },
  ];
  return (
    <main className="sub-screen profile-screen" aria-label="我的账户">
      <section className="profile-hero">
        <p>MY CELLAR</p><div className="profile-title"><span className="avatar"><PersonIcon /></span><div><h1>晚上好，林小姐</h1><small>杭州·西湖 · 品鉴会员</small></div><button type="button" onClick={() => onNotice("个人资料功能即将开放")}><ChevronRightIcon /></button></div>
        <div className="member-card"><div><span>NEIGHBORHOOD SOMMELIER</span><h2>品鉴会员 · SILVER</h2><p>再消费 ¥352 升级金樽会员</p></div><strong>680<small>酒滴</small></strong></div>
      </section>
      <section className="quick-links">{quick.map((item) => <button type="button" key={item.label} onClick={() => onNotice(`${item.label}功能已打开`)}>{item.icon}<strong>{item.value}</strong><span>{item.label}</span></button>)}</section>
      <section className="profile-section"><div className="list-title"><div><p>PERSONAL SERVICE</p><h2>账户与服务</h2></div></div><div className="service-list">{services.map((item) => <button type="button" key={item.label} onClick={() => onNotice(`${item.label}功能已打开`)}><span className="service-icon">{item.icon}</span><b>{item.label}</b><small>{item.note}</small><ChevronRightIcon /></button>)}</div></section>
      <section className="supplier-entry"><div><p>FOR LOCAL SUPPLIERS</p><h2>我是城市酒商</h2><span>缴纳保证金，审核后即可发布本地现货</span></div><button type="button" onClick={onOpenSupplier}>进入酒商端 <ChevronRightIcon /></button></section>
      <p className="responsible-drinking">理性饮酒 · 未成年人请勿饮酒</p>
    </main>
  );
}

function SupplierScreen({ onBack, onNotice }: { onBack: () => void; onNotice: (message: string) => void }) {
  const actions = [
    { icon: <PlusIcon />, title: "发布商品", note: "新增本地现货" },
    { icon: <BackpackIcon />, title: "订单管理", note: "3单待处理" },
    { icon: <BarChartIcon />, title: "清仓专区", note: "2款进行中" },
    { icon: <GearIcon />, title: "店铺设置", note: "营业中" },
  ];
  return (
    <main className="supplier-screen" aria-label="城市酒商工作台">
      <header className="supplier-header">
        <button type="button" aria-label="返回我的" onClick={onBack}><ChevronLeftIcon /></button>
        <div><p>CITY WINE MERCHANT</p><h1>城市酒商工作台</h1></div>
        <button type="button" aria-label="商家通知" onClick={() => onNotice("暂无新的商家通知")}><BellIcon /></button>
      </header>
      <section className="merchant-card">
        <div className="merchant-brand"><span>西湖仓</span><div><h2>栖霞葡萄酒商行</h2><p>杭州·西湖 · 距消费者 3.2km</p></div></div>
        <span className="merchant-verified"><CheckCircledIcon /> 平台认证酒商</span>
        <div className="merchant-meta"><span>保证金状态<small>¥10,000 · 已缴纳</small></span><span>履约评分<small>4.9 / 5.0</small></span><span>营业状态<small>营业中</small></span></div>
      </section>
      <section className="merchant-kpis">
        <div><span>今日成交</span><strong>¥ 6,328</strong><small>较昨日 +12.6%</small></div>
        <div><span>待发货</span><strong>3<small>单</small></strong><small>最早 16:30 前</small></div>
        <div><span>可售库存</span><strong>286<small>瓶</small></strong><small>低库存 2 款</small></div>
        <div><span>待结算</span><strong>¥ 8,920</strong><small>10月15日到账</small></div>
      </section>
      <section className="merchant-actions">
        <div className="merchant-section-title"><div><p>QUICK ACTIONS</p><h2>常用功能</h2></div></div>
        <div className="action-grid">{actions.map((item) => <button type="button" key={item.title} onClick={() => onNotice(`${item.title}已打开`)}><span>{item.icon}</span><b>{item.title}</b><small>{item.note}</small></button>)}</div>
      </section>
      <section className="merchant-panel">
        <div className="merchant-section-title"><div><p>FULFILLMENT</p><h2>待处理订单</h2></div><button type="button" onClick={() => onNotice("订单管理已打开")}>全部订单 <ChevronRightIcon /></button></div>
        <article className="merchant-order"><img src="/assets/wine/red-bordeaux.png" alt="靓茨伯庄园 2020" /><div><span>明日达 · 需16:30前出库</span><h3>靓茨伯庄园 2020 × 1</h3><p>订单尾号 0038 · 上海路配送点</p></div><button type="button" onClick={() => onNotice("订单已进入备货流程")}>开始备货</button></article>
        <article className="merchant-order"><img src="/assets/wine/white-sauvignon.png" alt="云雾之湾 长相思 2024" /><div><span>后日达 · 需今日出库</span><h3>云雾之湾 长相思 2024 × 2</h3><p>订单尾号 0041 · 文三路配送点</p></div><button type="button" onClick={() => onNotice("订单已进入备货流程")}>开始备货</button></article>
      </section>
      <section className="stock-alert">
        <div className="merchant-section-title"><div><p>INVENTORY ALERT</p><h2>库存提醒</h2></div><button type="button" onClick={() => onNotice("库存管理已打开")}>管理库存 <ChevronRightIcon /></button></div>
        <div className="stock-row"><img src="/assets/wine/red-bordeaux.png" alt="奔富 BIN 389" /><div><h3>奔富 BIN 389</h3><p>杭州仓 · 剩余 6 瓶</p></div><span>建议清仓</span></div>
      </section>
      <button className="supplier-primary" type="button" onClick={() => onNotice("发布商品表单已打开")}><PlusIcon /> 发布本地现货</button>
    </main>
  );
}

export default function Prototype() {
  const [occasion, setOccasion] = useState<Occasion>("steak");
  const [cart, setCart] = useState<string[]>([]);
  const [tab, setTab] = useState("home");
  const [notice, setNotice] = useState("");
  const copy = recommendations[occasion];
  const cartCount = useMemo(() => cart.length, [cart]);

  const addToCart = (id: string, name: string) => {
    setCart((current) => [...current, id]);
    setNotice(`${name} 已加入购物车`);
    window.setTimeout(() => setNotice(""), 1800);
  };

  const jumpToRecommendations = () => document.querySelector(".recommendations")?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="wine-app-shell">
      <MobileScroll className="app-screen" key={tab}>
        {tab === "home" || tab === "wine" ? <main className="wine-home" aria-label="身边酒窖消费者首页">
          <section className="hero" aria-label="今晚牛排配酒推荐">
            <img className="hero-image" src="/assets/wine/hero-steak-wine.png" alt="牛排、红酒杯与葡萄酒瓶" />
            <div className="hero-content">
              <button className="location-button" type="button" aria-label="切换配送位置"><SewingPinFilledIcon /><span>杭州·西湖</span><ChevronDownIcon /></button>
              <p className="delivery-note">附近优质酒庄 · 专注正品 · 明日达</p>
              <p className="hero-kicker">NEIGHBORHOOD SOMMELIER</p>
              <h1>今晚牛排<br />就喝这一瓶</h1>
              <p className="hero-subtitle">附近酒商精选 · 正品现货 · 明日达</p>
              <button className="hero-cta" type="button" onClick={jumpToRecommendations}>查看推荐 <ChevronRightIcon /></button>
            </div>
          </section>

          <div className="occasion-rail" role="tablist" aria-label="选择饮酒场景">
            {occasions.map((item) => (
              <button key={item.id} type="button" role="tab" aria-selected={occasion === item.id} className={`occasion ${occasion === item.id ? "is-active" : ""}`} onClick={() => setOccasion(item.id)}>
                <img src={item.image} alt="" /><span><strong>{item.title}</strong><small>{item.subtitle}</small></span>
              </button>
            ))}
          </div>

          <section className="recommendations">
            <header className="section-header">
              <div><p>{copy.eyebrow}</p><h2>{copy.title}</h2><span>{copy.subtitle}</span></div>
              <button type="button" className="text-link">查看更多 <ChevronRightIcon /></button>
            </header>
            <div className="wine-list">
              {wines.map((wine) => (
                <article className="wine-row" key={wine.id}>
                  <img className="wine-image" src={wine.image} alt={`${wine.name}葡萄酒`} />
                  <div className="wine-copy">
                    <div className="wine-topline"><span className="wine-badge">{wine.badge}</span><span className="verified"><CheckCircledIcon /> 附近认证酒商</span></div>
                    <h3>{wine.name}</h3><p className="origin">{wine.origin}</p><p className="notes">{wine.notes}</p>
                    <p className="quote">“{wine.quote}”<br /><span>—— 附近合作侍酒师</span></p>
                    <div className="purchase-line"><div><strong>¥ {wine.price}</strong><del>{wine.original}</del></div><div className="eta"><b>明日达</b><small>{wine.distance}</small></div></div>
                    <button className="cart-button" type="button" onClick={() => addToCart(wine.id, wine.name)}>加入购物车</button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="brand-banner" aria-label="品牌主张"><img src="/assets/wine/hero-steak-wine.png" alt="葡萄酒生活场景" /><div><p>身边的好酒&nbsp;&nbsp;更近的生活</p><small>NEIGHBORHOOD SOMMELIER</small></div></section>
        </main> : tab === "orders" ? <OrdersScreen onRepeat={() => addToCart("cloudy-bay", "云雾之湾 长相思 2024")} onNotice={setNotice} /> : tab === "supplier" ? <SupplierScreen onBack={() => setTab("profile")} onNotice={setNotice} /> : <ProfileScreen onNotice={setNotice} onOpenSupplier={() => setTab("supplier")} />}
      </MobileScroll>
      {tab !== "supplier" && <nav className="bottom-nav" aria-label="主导航">
        <button className={tab === "home" ? "active" : ""} onClick={() => setTab("home")}><HomeIcon /><span>首页</span></button>
        <button className={tab === "wine" ? "active" : ""} onClick={() => setTab("wine")}><BackpackIcon /><span>选酒</span></button>
        <button className={tab === "orders" ? "active" : ""} onClick={() => setTab("orders")}><BackpackIcon /><span>订单</span>{cartCount > 0 && <i>{cartCount}</i>}</button>
        <button className={tab === "profile" ? "active" : ""} onClick={() => setTab("profile")}><PersonIcon /><span>我的</span></button>
      </nav>}
      {notice && <div className="toast" role="status"><CheckCircledIcon /> {notice}</div>}
    </div>
  );
}
