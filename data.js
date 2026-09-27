/* ==========================================================================
   بيانات منتجات محل "فرحات"
   ==========================================================================
   عشان تعدّل أي سعر أو تضيف أو تشيل صنف: كل صنف عبارة عن سطر واحد بالشكل ده:

   { name: "اسم الصنف", price: 000, img: "images/اسم_الصورة.jpg" }

   - price: السعر بالجنيه (اكتبه رقم بس من غير "جنيه").
   - img: لو الصنف مالوش صورة حقيقية دلوقتي، سيب img: null وهيظهر بشكل
     أنيق بديل (أيقونة) لحد ما تبعتلي الصورة الحقيقية بتاعته.
   - الوحدة (كيلو / لتر...) بتتحدد مرة واحدة لكل قسم في unit تحت.

   ⚠️ الأسعار الحالية كلها أرقام مبدئية (placeholder) ما عدا زيت الزيتون
   (480) اللي انت حددته. لازم تراجع كل الأسعار وتغيّرها قبل ما ترفع
   الموقع فعليًا.

   -------------------------------------------------------------------------
   الأوزان (تُمن / ربع / نص / كيلو):
   -------------------------------------------------------------------------
   لو حطيت hasWeights: true على أي قسم (زي المكسرات والبن والشوكولاتة
   والزيوت والشاي والنسكافيه تحت)، هيظهر للعميل تلقائيًا 4 أزرار وزن تحت
   كل صنف في القسم ده (تُمن / ربع / نص / كيلو)، والسعر بتاعهم بيتحسب
   تلقائيًا من الـ price المكتوب (سعر الكيلو/اللتر الكامل) - مش محتاج
   تكتب سعر لكل وزن لوحده.
   -------------------------------------------------------------------------
   قسم "المزاج" (قهوة/شاي/نسكافيه) وقسم "الشوكولاتة" (بالوزن/علب):
   -------------------------------------------------------------------------
   القسمين دول شكلهم مختلف شوية: بدل ما يكون items مباشرة، عندهم tabs
   (تبويبات)، كل تبويب زي أي قسم عادي بالظبط (له عنوان وأيقونة ووحدة
   وأصناف). عايز تضيف صنف قهوة جديد؟ روح لـ tabs → coffee → items وزوّد
   سطر زيهم بالظبط. نفس الكلام على tabs → choc-weight → items.

   ملحوظة: أوزان الشوكولاتة بالوزن (ربع/نص/كيلو بس، من غير تُمن) مختلفة
   عن باقي الأقسام، عشان كده التبويب بتاعها فيه سطر إضافي:
   weightOptions: CHOC_WEIGHT_OPTIONS
   -------------------------------------------------------------------------
   "علبة هدايا فرحات" (صنف اختيار حر من غير سعر ثابت):
   -------------------------------------------------------------------------
   دي علبة العميل بيكوّن محتواها بنفسه من تبويب "شكولاتة بالوزن" جوه
   بوب-أب مخصص (مش بيتنقل لتبويب تاني)، فمالهاش سعر ثابت. بتتعمل بالشكل ده:

   {
     name: "اسم العلبة",
     img: "images/...",
     customBox: true,          // يفتح بوب-أب "كوّن علبتك" بدل زرار الإضافة العادي
     linkToTab: "choc-weight", // التبويب اللي هيتجاب منه الأصناف والأسعار جوه البوب-أب
     minWeight: 1.5,           // أقل وزن إجمالي مسموح بيه (بالوحدة اللي في weightUnitLabel)
     maxWeight: 2,             // أعلى وزن إجمالي مسموح بيه
     weightUnitLabel: "كيلو",
     note: "النص اللي هيظهر تحت الصورة يوضّح الفكرة للعميل",
   }

   لما العميل يأكد اختياره، بيتضاف للسلة كصنف واحد بسعر = مجموع
   (سعر الكيلو لكل نوع × الوزن المختار منه)، وتفاصيل التشكيلة بتظهر
   تحت اسم الصنف في السلة وفي رسالة واتساب.
   -------------------------------------------------------------------------
   خانة "منطقة التوصيل" في السلة (تُمن..إلخ مش لازمة هنا):
   -------------------------------------------------------------------------
   العميل بيختار من قايمة EGYPT_GOVERNORATES تحت، أو "داخل المنزلة".
   لو اختار "داخل المنزلة" بيظهر تنويه إن التوصيل من 15 لـ 20 جنيه (إنت
   اللي بتحدد الرقم الفعلي في الشات حسب قرب/بعد العنوان). لو اختار
   محافظة تانية بيظهر تنويه إن تكلفة الشحن هتتحدد حسب وزن الطلب، وبتوصلك
   في رسالة الواتساب اسم المحافظة عشان ترد عليه بالتكلفة. عايز تضيف
   محافظة أو تعدّل الأسماء؟ عدّل قايمة EGYPT_GOVERNORATES مباشرة.
   -------------------------------------------------------------------------
   خيار "سادة / محوج" (تبويب قهوة بس):
   -------------------------------------------------------------------------
   لو حطيت grindOptions على أي تبويب (زي قهوة)، هيظهر زرارين فوق أوزان
   كل صنف يختار منهم العميل. كل خيار بياخد priceAdd (بالجنيه) بيتضاف
   على سعر الكيلو الأساسي قبل ما يتحسب سعر الوزن المختار. عدّل رقم الـ
   priceAdd هنا لو فرق سعر المحوج عن الساده مختلف عن 15 جنيه/كيلو.
   -------------------------------------------------------------------------
   excludeFromBox (تبويب شكولاتة بالوزن بس):
   -------------------------------------------------------------------------
   أي صنف عليه excludeFromBox: true بيظهر عادي في "شكولاتة بالوزن" للبيع
   المباشر، بس مش بيظهر ضمن الأنواع اللي العميل يقدر يختارها لما يكوّن
   "علبة هدايا فرحات الخاصة".
   ========================================================================== */

const WEIGHT_OPTIONS = [
  { key: "eighth", factor: 0.125, label: "تُمن" },
  { key: "quarter", factor: 0.25, label: "ربع" },
  { key: "half", factor: 0.5, label: "نص" },
  { key: "full", factor: 1, label: "كامل" },
];

// أوزان الشوكولاتة بالوزن (من غير تُمن، زي ما اتحدد)
const CHOC_WEIGHT_OPTIONS = [
  { key: "quarter", factor: 0.25, label: "ربع" },
  { key: "half", factor: 0.5, label: "نص" },
  { key: "full", factor: 1, label: "كامل" },
];

// محافظات مصر (لخانة "منطقة التوصيل" في السلة) - "داخل المنزلة" بيظهر منفصل قبلها
const EGYPT_GOVERNORATES = [
  "القاهرة", "الجيزة", "الإسكندرية", "الدقهلية", "البحر الأحمر", "البحيرة",
  "الفيوم", "الغربية", "الإسماعيلية", "المنوفية", "المنيا", "القليوبية",
  "الوادي الجديد", "السويس", "أسوان", "أسيوط", "بني سويف", "بورسعيد",
  "دمياط", "الشرقية", "جنوب سيناء", "كفر الشيخ", "مطروح", "الأقصر",
  "قنا", "شمال سيناء", "سوهاج",
];

const STORE = {
  name: "فرحات",
  tagline: "عالم من الجودة",
  whatsapp: "201019914575", // رقم واتساب المحل (بالكود الدولي بدون +)
  address: "المنزلة - شارع عمر أفندي - أمام مسجد شلباية",
  mapsUrl: "https://maps.app.goo.gl/nYio5xdCsxLR85qa6",
  facebook: "https://www.facebook.com/share/1DjkpeidTK/?mibextid=wwXIfr",
  instagram: "https://www.instagram.com/farhat.store1?igsi=MmlvbTIwOW1uOXF1",
  sections: [
    {
      id: "nuts",
      title: "المكسرات",
      icon: "🌰",
      unit: "جنيه / كيلو",
      hasWeights: true,
      items: [
        { name: "فسدق أمريكي جامبو", price: 1040, img: "images/nuts/n08_fostoq_jumbo.jpg" , bestseller: true },
        { name: "كاجو أمريكي جامبو", price: 1040, img: "images/nuts/n09_cashew_jumbo.jpg" , bestseller: true },
        { name: "فسدق حلبي", price: 1400, img: "images/nuts/n15_fostoq_halabi.jpg" },
        { name: "لوز أمريكي جامبو", price: 720, img: "images/nuts/n10_loz_jumbo.jpg" },
        { name: "لوز برازيلي", price: 2400, img: "images/nuts/n13_loz_brazily.jpg" },
        { name: "لوز انصاف", price: 800, img: "images/nuts/n05_loz_ansaf.jpg" },
        { name: "بندق مقشر", price: 1000, img: "images/nuts/n17_bondoq_moqashar.jpg" },
        { name: "بندق محمص", price: 1100, img: "images/nuts/n16_bondoq_mohammas.jpg" },
        { name: "بيكان", price: 1200, img: "images/nuts/n19_pecan.jpg" },
        { name: "مكاديميا", price: 800, img: "images/nuts/n18_macadamia.jpg" },
        { name: "عين جمل أمريكي جامبو", price: 720, img: "images/nuts/n12_walnut_jumbo.jpg" },
        { name: "صنوبر", price: 2800, img: "images/nuts/n11_sanawbar.jpg" },
        { name: "لوز أمريكي محمص جامبو", price: 800, img: "images/nuts/n14_loz_mohammas.jpg" },
      ],
    },
    {
      id: "mood",
      title: "المزاج",
      icon: "☕",
      tabs: [
        {
          id: "coffee",
          title: "قهوة",
          icon: "☕",
          unit: "جنيه / كيلو",
          hasWeights: true,
          // خيار سادة / محوج لكل نوع قهوة — المحوج بيتحسب بسعر إضافي فوق سعر
          // الكيلو الأساسي (priceAdd)، وبيتوضّح في السلة ورسالة الواتساب.
          grindOptions: [
            { key: "plain", label: "سادة", priceAdd: 0 },
            { key: "spiced", label: "محوج", priceAdd: 50 },
          ],
          items: [
            { name: "بن برازيلي", price: 760, img: "images/coffee/e16_brazilian.jpg" , bestseller: true },
            { name: "بن كولمبي", price: 1040, img: "images/coffee/e08_colombian.jpg" , bestseller: true },
            { name: "توليفه اسبشيال", price: 880, img: "images/coffee/e11_special.jpg" },
            { name: "توليفه سوبر", price: 880, img: "images/coffee/e13_super.jpg" , bestseller: true },
            { name: "توليفه تفويقة", price: 880, img: "images/coffee/e12_tafwiqa.jpg" },
            { name: "توليفه عميد", price: 960, img: "images/coffee/e14_amid.jpg" },
            { name: "بن حبشي", price: 960, img: "images/coffee/e09_ethiopian.jpg" },
            { name: "بن كولمبي إكسترا", price: 1040, img: "images/coffee/e15_colombian_extra.jpg" },
            { name: "بن جواتيمالا", price: 1000, img: "images/coffee/e10_guatemala.jpg" },
            { name: "بن ميسور", price: 1120, img: "images/coffee/e17_maysour.jpg" },
            { name: "قهوة فرنسي", price: 760, img: "images/coffee/e07_french.jpg", noGrind: true },
            { name: "قهوة بندق", price: 760, img: "images/coffee/e18_hazelnut.jpg", noGrind: true },
            { name: "بن بيرو", price: 960, img: "images/coffee/e19_peru.jpg" },
          ],
        },
        {
          id: "tea",
          title: "شاي",
          icon: "🍵",
          unit: "جنيه / كيلو",
          hasWeights: true,
          items: [
            { name: "شاي ناعم", price: 200, img: "images/tea/t4_naem.jpg" },
            { name: "شاي خشن", price: 240, img: "images/tea/t1_khashin.jpg" },
            { name: "شاي ورق", price: 260, img: "images/tea/t2_waraq.jpg" },
            { name: "شاي كرك", price: 600, img: "images/tea/t3_karak.jpg" },
          ],
        },
        {
          id: "nescafe",
          title: "نسكافيه",
          icon: "🥤",
          unit: "جنيه / كيلو",
          hasWeights: true,
          items: [
            { name: "نسكافيه بلاك", price: 1040, img: "images/nescafe/nb_black.jpg" },
            { name: "نسكافيه جولد", price: 1200, img: "images/nescafe/ng_gold.jpg" },
          ],
        },
        {
          id: "mabakhir",
          title: "سبرتايات",
          icon: "🔥",
          unit: "جنيه / قطعة",
          items: [
            { name: "سبرتايه كلاسيك 1", price: 320, img: "images/mabakhir/sabartaya_classic_1.jpg" },
            { name: "سبرتايه كلاسيك 2", price: 360, img: "images/mabakhir/sabartaya_classic_2.jpg" },
            { name: "سبرتايه كلاسيك 3", price: 360, img: "images/mabakhir/sabartaya_classic_3.jpg" },
            { name: "سبرتايه كلاسيك 4", price: 380, img: "images/mabakhir/sabartaya_classic_4.jpg" },
            { name: "سبرتايه ملكي 1", price: 700, img: "images/mabakhir/sabartaya_malaki_1.jpg" },
            { name: "سبرتايه ملكي 2", price: 1200, img: "images/mabakhir/sabartaya_malaki_2.jpg" },
            { name: "أبريق", price: 700, img: "images/mabakhir/abriq.jpg" },
            { name: "كنكة كلاسيك 1", price: 250, img: "images/mabakhir/kanaka_classic_1.jpg" },
          ],
        },
      ],
    },
    {
      id: "chocolate",
      title: "الشكولاتة",
      icon: "🍫",
      tabs: [
        {
          id: "choc-weight",
          title: "شكولاتة بالوزن",
          icon: "⚖️",
          unit: "جنيه / كيلو",
          hasWeights: true,
          weightOptions: CHOC_WEIGHT_OPTIONS,
          items: [
            { name: "قهوة", price: 680, img: "images/choc/c01_qahwa.jpg" },
            { name: "لوتس", price: 680, img: "images/choc/c02_lotus.jpg" },
            { name: "قاليرو", price: 780, img: "images/choc/c03_qaliro.jpg" },
            { name: "سبيكة", price: 780, img: "images/choc/c04_sabika.jpg" },
            { name: "كسر مكسرات", price: 780, img: "images/choc/c05_kasr_mokasarat.jpg" },
            { name: "بيستاشيو", price: 880, img: "images/choc/c06_pistachio.jpg" },
            { name: "كندر", price: 880, img: "images/choc/c07_kinder.jpg" },
            { name: "كنافة دبي", price: 880, img: "images/choc/c08_kunafa_dubai.jpg" },
            { name: "فيريرو", price: 880, img: "images/choc/c09_ferrero.jpg" },
            { name: "كسر كاجو", price: 780, img: "images/choc/c10_kasr_cashew.jpg" },
            { name: "أوريو", price: 640, img: "images/choc/c11_oreo.jpg" },
            { name: "كابتشينو", price: 640, img: "images/choc/c12_cappuccino.jpg" },
            { name: "كراميل", price: 640, img: "images/choc/c13_caramel.jpg" },
            { name: "ساده طبيعي", price: 500, img: "images/choc/c14_sada_tabiei.jpg" },
            { name: "توست فانيليا", price: 500, img: "images/choc/c15_toast_vanilla.jpg" },
            { name: "توست قهوة", price: 500, img: "images/choc/c16_toast_qahwa.jpg" },
            { name: "جوز هند", price: 320, img: "images/choc/d1_coconut.jpg" },
            { name: "كرانشي عسل", price: 360, img: "images/choc/d2_honey_crunch.jpg" },
            { name: "روشية لوز", price: 360, img: "images/choc/d3_roshia_almond.jpg" },
            { name: "شوكو لونس", price: 360, img: "images/choc/d4_choco_lotus.jpg" },
            { name: "كريسبي", price: 320, img: "images/choc/d5_crispy.jpg" },
            { name: "ويفر", price: 320, img: "images/choc/d6_wafer.jpg" },
            // 16 صنف جديد (توفي أولكر، أوريو كاريه، كريسبينو، بسكوت كاريه،
            // سوداني بالكرامل، ميجا) — excludeFromBox: true عشان ميظهروش
            // ضمن الأنواع اللي العميل يقدر يختارها في "علبة هدايا فرحات
            // الخاصة" (مطلوب صراحة إنهم يفضلوا للبيع بالوزن هنا بس).
            // الأسعار دلوقتي مبدئية 100 لحد ما تحددها انت.
            { name: "طوفي بالتوت", price: 100, img: "images/choc/e01_toffee_blackberry.jpg", excludeFromBox: true },
            { name: "طوفي بالمستكة", price: 100, img: "images/choc/e02_toffee_mastic.jpg", excludeFromBox: true },
            { name: "طوفي بالنعناع", price: 100, img: "images/choc/e03_toffee_mint.jpg", excludeFromBox: true },
            { name: "طوفي بالبطيخ", price: 100, img: "images/choc/e04_toffee_watermelon.jpg", excludeFromBox: true },
            { name: "طوفي بالحليب", price: 100, img: "images/choc/e05_toffee_milk.jpg", excludeFromBox: true },
            { name: "طوفي بالفراولة", price: 100, img: "images/choc/e06_toffee_strawberry.jpg", excludeFromBox: true },
            { name: "طوفي بالكراميل", price: 100, img: "images/choc/e07_toffee_caramel.jpg", excludeFromBox: true },
            { name: "أوريو شيكولاتة", price: 100, img: "images/choc/e08_oreo_choco.jpg", excludeFromBox: true },
            { name: "أوريو أبيض", price: 100, img: "images/choc/e09_oreo_white.jpg", excludeFromBox: true },
            { name: "كريسبينو", price: 100, img: "images/choc/e10_crispino.jpg", excludeFromBox: true },
            { name: "بسكوت ضوابع أبيض", price: 100, img: "images/choc/e11_biscuit_white_hazelnut.jpg", excludeFromBox: true },
            { name: "بسكوت ضوابع شيكولاتة", price: 100, img: "images/choc/e12_biscuit_choco_hazelnut.jpg", excludeFromBox: true },
            { name: "سوداني بالكراميل", price: 100, img: "images/choc/e13_peanut_caramel.jpg", excludeFromBox: true },
            { name: "طوفي بجوز الهند", price: 100, img: "images/choc/e14_toffee_coconut.jpg", excludeFromBox: true },
            { name: "كاريه جوز هند", price: 100, img: "images/choc/e15_carre_coconut.jpg", excludeFromBox: true },
            { name: "ميجا كراميل", price: 100, img: "images/choc/e16_mega_caramel.jpg", excludeFromBox: true },
          ],
        },
        {
          id: "choc-boxes",
          title: "علب شكولاتة",
          icon: "🎁",
          unit: "جنيه / علبة",
          items: [
            { name: "علبة Good Morning – وردي", price: 600, img: "images/choc-boxes/box01_goodmorning_pink.jpg" },
            { name: "فيريرو كولكشن", price: 780, img: "images/choc-boxes/box02_ferrero_collection.jpg" },
            {
              name: "علبة هدايا فرحات الخاصة",
              img: "images/choc-boxes/box03_farahat_special.jpg",
              customBox: true, // علبة اختيار حر: العميل يختار الأنواع ويحددها بالوزن جوه بوب-أب مخصص، وتتضاف للسلة كصنف واحد بالتشكيلة اللي اختارها
              linkToTab: "choc-weight",
              minWeight: 1.5,
              maxWeight: 2,
              weightUnitLabel: "كيلو",
              note: "كوّن علبتك بنفسك من تشكيلة شكولاتة بالوزن، بشرط إن إجمالي العلبة يكون من 1.5 كيلو لحد 2 كيلو",
              bestseller: true,
            },
            { name: "علبة Good Morning – أحمر", price: 600, img: "images/choc-boxes/box04_goodmorning_red.jpg" },
            { name: "جالاكسي جواهر", price: 1100, img: "images/choc-boxes/box05_galaxy_jawaher.jpg" },
            { name: "علبة Good Morning – أزرق", price: 600, img: "images/choc-boxes/box06_goodmorning_blue.jpg" },
            { name: "علبة Good Morning – مواليد", price: 600, img: "images/choc-boxes/box07_goodmorning_baby.jpg" },
            { name: "علبة Good Morning – أبيض ذهبي", price: 600, img: "images/choc-boxes/box08_goodmorning_gold.jpg" },
            // 5 أصناف جديدة (فيريرو روشيه بحجمين، فاليرو كراميل بـ3 تصاميم) —
            // أسعار مبدئية 100، هتتظبط من الداشبورد.
            { name: "فيريرو روشيه 16 قطعة", price: 100, img: "images/choc-boxes/box09_ferrero_16.jpg" },
            { name: "فاليرو شوكولاتة كراميل - تصميم الجبال", price: 100, img: "images/choc-boxes/box10_valero_caramel_v1.jpg" },
            { name: "فاليرو شوكولاتة كراميل - تصميم الأقواس", price: 100, img: "images/choc-boxes/box11_valero_caramel_v2.jpg" },
            { name: "فيريرو روشيه 24 قطعة", price: 100, img: "images/choc-boxes/box12_ferrero_24.jpg" },
            { name: "فاليرو بريميوم كراميل 1 كيلو", price: 100, img: "images/choc-boxes/box13_valero_premium.jpg" },
          ],
        },
      ],
    },
    {
      id: "honey",
      title: "العسل",
      icon: "🍯",
      unit: "جنيه / كيلو",
      items: [
        { name: "عسل برسيم", price: 240, img: "images/honey/honey_barseem.jpg" , bestseller: true },
        { name: "عسل موالح", price: 240, img: "images/honey/honey_mawaleh.jpg" },
        { name: "عسل شمر", price: 360, img: "images/honey/honey_shammar.jpg" },
        { name: "عسل حبة البركة", price: 320, img: "images/honey/honey_habbat_elbaraka.jpg" },
        { name: "عسل زهور جبلية", price: 400, img: "images/honey/honey_zohour_jabaliya.jpg" },
        { name: "عسل إثيل جبلي", price: 600, img: "images/honey/honey_ethel_jabali.jpg" },
        { name: "عسل سدر جبلي", price: 800, img: "images/honey/honey_sidr_jabali.jpg" , bestseller: true },
      ],
    },
    {
      id: "oils",
      title: "الزيوت الطبيعية",
      icon: "🫒",
      unit: "جنيه / لتر",
      hasWeights: true,
      weightUnit: "لتر",
      weightOptions: CHOC_WEIGHT_OPTIONS, // نفس أوزان شكولاتة بالوزن (ربع / نص / كامل - من غير تُمن)
      items: [
        { name: "زيت زيتون بكر - عصرة أولى", price: 480, img: "images/oils/oil01_zeit_zaytoon.jpg" },
      ],
    },
    {
      id: "snacks",
      title: "المقرمشات والتسالي",
      icon: "🥨",
      unit: "جنيه / عبوة",
      items: [
        { name: "ذرة أسباني (كاتشب - جبنة - ملح)", price: 60, img: "images/snacks/snack05_dora_espani.jpg" },
        { name: "مكسرات صيني", price: 70, img: "images/snacks/snack01_makassarat_seeny.jpg" },
        { name: "كاندي اسباني", price: 60, img: "images/snacks/snack04_candy_espani.jpg" },
        { name: "بذور اليقطين", price: 90, img: "images/snacks/snack02_bothoor_yaqteen.jpg" },
        { name: "فواكه مجففة مشكلة", price: 180, img: "images/snacks/snack03_fawakeh_mojaffafa.jpg" , bestseller: true },
      ],
    },
    {
      id: "dates",
      title: "التمور",
      icon: "🌴",
      unit: "جنيه / عبوة",
      items: [
        { name: "عجوة المدينة", price: 250, img: "images/dates/dates_madina.jpg" },
        { name: "تمر القصيم السكري", price: 120, img: "images/dates/dates_qassim_sukari.jpg" },
        { name: "تمر المجدول", price: 300, img: "images/dates/dates_majdoul.jpg" , bestseller: true },
        { name: "تمر القصيم الصقعي", price: 280, img: "images/dates/dates_qassim_saqi.jpg" },
      ],
    },
  ],
};

// متاحة للوحة التحكم (admin/admin.js) عشان تقدر "تعبّي" أول نسخة من
// المنتجات في Firestore من غير ما حد يكتبهم يدوي واحد واحد
window.STORE = STORE;
