/**
 * Sample seed data for NK Enterprises ERP
 * Inserted on first launch to give the app a working demo state
 */

export const SEED_SETTINGS = [
  { key: 'shop_name', value: 'NK Enterprises' },
  { key: 'shop_address', value: 'Chegunta, Telangana' },
  { key: 'shop_gstin', value: '36BHLPN7476G1ZR' },
  { key: 'shop_phone1', value: '9701987402' },
  { key: 'shop_phone2', value: '9490251262' },
  { key: 'shop_email', value: '' },
  { key: 'invoice_prefix', value: 'NK' },
  { key: 'show_gstin_on_invoice', value: 'true' },
  { key: 'theme', value: 'dark_blue' },
  { key: 'currency_symbol', value: '₹' },
  { key: 'auto_lock_minutes', value: '30' },
  { key: 'schema_version', value: '1' },
];

// PIN hash = simple hash for demo (in production use bcrypt or similar)
// Demo PINs: admin=1234, manager=5678, sales=0000
export const SEED_USERS = [
  { username: 'admin', full_name: 'Admin', pin_hash: '1234', role: 'admin', is_active: 1 },
  { username: 'manager', full_name: 'Store Manager', pin_hash: '5678', role: 'manager', is_active: 1 },
  { username: 'sales', full_name: 'Salesperson', pin_hash: '0000', role: 'salesperson', is_active: 1 },
];

export const SEED_CATEGORIES = [
  { name: 'Mobiles', description: 'Smartphones and feature phones', icon: 'smartphone' },
  { name: 'TVs', description: 'LED, OLED, QLED televisions', icon: 'tv' },
  { name: 'Refrigerators', description: 'Single door, double door, side-by-side fridges', icon: 'thermometer' },
  { name: 'Washing Machines', description: 'Front load, top load washing machines', icon: 'droplet' },
  { name: 'Speakers & Audio', description: 'Bluetooth speakers, soundbars, headphones', icon: 'speaker' },
  { name: 'Air Conditioners', description: 'Split AC, window AC, portable AC', icon: 'wind' },
  { name: 'Laptops', description: 'Notebooks, ultrabooks, gaming laptops', icon: 'monitor' },
  { name: 'Tablets', description: 'iPads, Android tablets, e-readers', icon: 'tablet' },
  { name: 'Accessories', description: 'Chargers, cases, cables, peripherals', icon: 'headphones' },
  { name: 'Kitchen Appliances', description: 'Mixers, ovens, induction cooktops', icon: 'coffee' },
];

export const SEED_BRANDS = [
  { name: 'Samsung', description: 'South Korean electronics giant' },
  { name: 'Apple', description: 'Premium consumer electronics' },
  { name: 'Sony', description: 'Japanese electronics and entertainment' },
  { name: 'LG', description: 'Life\'s Good - home appliances & electronics' },
  { name: 'Dell', description: 'American computer technology company' },
  { name: 'HP', description: 'Hewlett-Packard computers and printers' },
  { name: 'Lenovo', description: 'Chinese multinational technology company' },
  { name: 'Xiaomi', description: 'Chinese electronics company (Redmi, Mi)' },
  { name: 'OnePlus', description: 'Premium Android smartphones' },
  { name: 'Whirlpool', description: 'American home appliances' },
  { name: 'Bosch', description: 'German engineering and home appliances' },
  { name: 'JBL', description: 'Audio equipment and speakers' },
  { name: 'Daikin', description: 'Japanese air conditioning manufacturer' },
  { name: 'Realme', description: 'Budget-friendly smartphones' },
  { name: 'Vivo', description: 'Chinese smartphone manufacturer' },
  { name: 'Oppo', description: 'Chinese consumer electronics' },
  { name: 'Bajaj', description: 'Indian consumer electricals and appliances' },
  { name: 'Havells', description: 'Indian electrical equipment and home appliances' },
  { name: 'Symphony', description: 'Indian air cooler manufacturer' },
  { name: 'Voltas', description: 'Indian air conditioning and cooling appliances' },
  { name: 'Panasonic', description: 'Japanese diversified electronics corporation' },
  { name: 'Haier', description: 'Chinese multinational home appliances giant' },
  { name: 'Philips', description: 'Dutch consumer electronics and lighting' },
  { name: 'Godrej', description: 'Indian home appliances brand' },
  { name: 'V-Guard', description: 'Indian electrical appliances and stabilizers' },
];

// categoryId and brandId will be resolved by name during seeding
export const SEED_PRODUCTS = [
  // Mobiles
  { name: 'Samsung Galaxy S24 Ultra', category: 'Mobiles', brand: 'Samsung', model: 'Galaxy S24 Ultra', variant: '256GB Titanium Black', sku: 'MOB-SAM-001', barcode: '8806095584546', cost_price: 109000, selling_price: 129999, gst_rate: 18, stock: 8, reorder: 3, warranty: 12, image: 'https://images.samsung.com/is/image/samsung/p6pim/in/2401/gallery/in-galaxy-s24-ultra-s928-sm-s928bztdins-thumb-539573527' },
  { name: 'Apple iPhone 15 Pro Max', category: 'Mobiles', brand: 'Apple', model: 'iPhone 15 Pro Max', variant: '256GB Natural Titanium', sku: 'MOB-APL-001', barcode: '194253945123', cost_price: 135000, selling_price: 159900, gst_rate: 18, stock: 5, reorder: 2, warranty: 12, image: 'https://store.storeimages.cdn-apple.com/4668/as-images.apple.com/is/iphone-15-pro-finish-select-202309-6-1inch-naturaltitanium' },
  { name: 'Samsung Galaxy A55', category: 'Mobiles', brand: 'Samsung', model: 'Galaxy A55', variant: '128GB Awesome Blue', sku: 'MOB-SAM-002', barcode: '8806095603452', cost_price: 28000, selling_price: 34999, gst_rate: 18, stock: 15, reorder: 5, warranty: 12, image: 'https://images.samsung.com/is/image/samsung/p6pim/in/2404/gallery/in-galaxy-a55-5g-sm-a556elbdins-thumb-539845994' },
  { name: 'OnePlus 12', category: 'Mobiles', brand: 'OnePlus', model: 'OnePlus 12', variant: '256GB Silky Black', sku: 'MOB-ONE-001', barcode: '6921815621458', cost_price: 52000, selling_price: 64999, gst_rate: 18, stock: 10, reorder: 3, warranty: 12, image: 'https://oasis.opstatics.com/content/dam/oasis/page/2024/in/oneplus-12/specs/black-img.png' },
  { name: 'Xiaomi Redmi Note 13 Pro', category: 'Mobiles', brand: 'Xiaomi', model: 'Redmi Note 13 Pro', variant: '128GB Midnight Black', sku: 'MOB-XIA-001', barcode: '6941812749553', cost_price: 18000, selling_price: 22999, gst_rate: 18, stock: 20, reorder: 5, warranty: 12, image: 'https://i02.appmifile.com/mi-com-product/fly-it-img-2023/redmi-note-13-pro/M/7c5d1798a3e6bc6a2f553ef72097ebba.png' },
  { name: 'Realme GT 6T', category: 'Mobiles', brand: 'Realme', model: 'GT 6T', variant: '128GB Fluid Silver', sku: 'MOB-REA-001', barcode: '6941764474382', cost_price: 24000, selling_price: 29999, gst_rate: 18, stock: 12, reorder: 4, warranty: 12, image: 'https://image01.realme.net/general/20240520/1716186507037.png' },

  // TVs
  { name: 'Sony Bravia 55" 4K Smart TV', category: 'TVs', brand: 'Sony', model: 'KD-55X80L', variant: '55 inch 4K HDR', sku: 'TV-SON-001', barcode: '4548736132658', cost_price: 58000, selling_price: 74990, gst_rate: 18, stock: 4, reorder: 2, warranty: 24, image: 'https://sony.scene7.com/is/image/sonyglobalsolutions/KD-55X80L_Gal01' },
  { name: 'Samsung Crystal 4K 50" TV', category: 'TVs', brand: 'Samsung', model: 'UA50CUE60AK', variant: '50 inch Crystal 4K', sku: 'TV-SAM-001', barcode: '8806095026893', cost_price: 35000, selling_price: 44990, gst_rate: 18, stock: 6, reorder: 2, warranty: 24, image: 'https://images.samsung.com/is/image/samsung/p6pim/in/ua50cue60aklxl/gallery/in-crystal-uhd-4k-smart-tv-ua50cue60aklxl-536486181' },
  { name: 'LG OLED 55" C3', category: 'TVs', brand: 'LG', model: 'OLED55C3PSA', variant: '55 inch OLED evo', sku: 'TV-LG-001', barcode: '8806091995261', cost_price: 95000, selling_price: 124990, gst_rate: 18, stock: 3, reorder: 1, warranty: 24, image: 'https://www.lg.com/content/dam/channel/wcms/in/tvs/oled55c3psa/gallery/DZ-01.jpg' },

  // Refrigerators
  { name: 'Samsung 253L Frost Free', category: 'Refrigerators', brand: 'Samsung', model: 'RT28T3922S8', variant: '253L Double Door Silver', sku: 'REF-SAM-001', barcode: '8806092889546', cost_price: 19000, selling_price: 24990, gst_rate: 18, stock: 5, reorder: 2, warranty: 36, image: 'https://images.samsung.com/is/image/samsung/p6pim/in/rt28t3922s8-hl/gallery/in-top-mount-freezer-rt28t3922s8-hl-361858537' },
  { name: 'LG 343L Frost Free', category: 'Refrigerators', brand: 'LG', model: 'GL-T382RPZ3', variant: '343L Double Door Shiny Steel', sku: 'REF-LG-001', barcode: '8806091432651', cost_price: 30000, selling_price: 38990, gst_rate: 18, stock: 4, reorder: 2, warranty: 36, image: 'https://www.lg.com/content/dam/channel/wcms/in/refrigerators/gl-t382rpz3/gallery/DZ_01.jpg' },

  // Washing Machines
  { name: 'LG 8kg Front Load', category: 'Washing Machines', brand: 'LG', model: 'FHM1208ZDL', variant: '8kg AI Direct Drive', sku: 'WM-LG-001', barcode: '8806091658742', cost_price: 28000, selling_price: 35990, gst_rate: 18, stock: 4, reorder: 2, warranty: 24, image: 'https://www.lg.com/content/dam/channel/wcms/in/washingmachines/fhm1208zdl/gallery/DZ_01.jpg' },
  { name: 'Samsung 7kg Top Load', category: 'Washing Machines', brand: 'Samsung', model: 'WA70A4002GS', variant: '7kg Fully Automatic', sku: 'WM-SAM-001', barcode: '8806092558741', cost_price: 14000, selling_price: 18490, gst_rate: 18, stock: 6, reorder: 2, warranty: 24, image: 'https://images.samsung.com/is/image/samsung/p6pim/in/wa70a4002gs-tl/gallery/in-top-load-wa70a4002gs-tl-362127746' },

  // Speakers & Audio
  { name: 'JBL Flip 6', category: 'Speakers & Audio', brand: 'JBL', model: 'Flip 6', variant: 'Black Portable', sku: 'SPK-JBL-001', barcode: '6925281993114', cost_price: 7500, selling_price: 9999, gst_rate: 18, stock: 15, reorder: 5, warranty: 12, image: 'https://www.jbl.com/dw/image/v2/AAUJ_PRD/on/demandware.static/-/Sites-masterCatalog_Harman/default/dw80bb4be1/JBL_Flip6_Product_Photo_Hero_Black.png' },
  { name: 'Sony WH-1000XM5', category: 'Speakers & Audio', brand: 'Sony', model: 'WH-1000XM5', variant: 'Black Wireless NC', sku: 'SPK-SON-001', barcode: '4548736135116', cost_price: 22000, selling_price: 29990, gst_rate: 18, stock: 8, reorder: 3, warranty: 12, image: 'https://sony.scene7.com/is/image/sonyglobalsolutions/WH-1000XM5_B_v2_ProductShot' },

  // Air Conditioners
  { name: 'Daikin 1.5 Ton Split AC', category: 'Air Conditioners', brand: 'Daikin', model: 'MTKL50U', variant: '1.5 Ton 3 Star Inverter', sku: 'AC-DAI-001', barcode: '4548848954623', cost_price: 35000, selling_price: 42990, gst_rate: 28, stock: 4, reorder: 2, warranty: 60, image: 'https://www.daikinindia.com/sites/default/files/2024-02/MTKL50U.png' },

  // Laptops
  { name: 'Dell Inspiron 15', category: 'Laptops', brand: 'Dell', model: 'Inspiron 3520', variant: 'i5 12th Gen 8GB 512SSD', sku: 'LAP-DEL-001', barcode: '884116469854', cost_price: 48000, selling_price: 62990, gst_rate: 18, stock: 6, reorder: 2, warranty: 12, image: 'https://i.dell.com/is/image/DellContent/content/dam/ss2/product-images/dell-client-products/notebooks/inspiron-notebooks/inspiron-15-3520/media-gallery/notebook-inspiron-15-3520-fpr-gallery-1.psd' },
  { name: 'HP Pavilion 14', category: 'Laptops', brand: 'HP', model: 'Pavilion 14-dv2014TU', variant: 'i5 12th Gen 16GB 512SSD', sku: 'LAP-HP-001', barcode: '196548746825', cost_price: 55000, selling_price: 72990, gst_rate: 18, stock: 4, reorder: 2, warranty: 12, image: 'https://ssl-product-images.www8-hp.com/digmedialib/prodimg/lowres/c08382048.png' },
  { name: 'Lenovo IdeaPad Slim 3', category: 'Laptops', brand: 'Lenovo', model: 'IdeaPad Slim 3', variant: 'Ryzen 5 8GB 512SSD', sku: 'LAP-LEN-001', barcode: '196802544825', cost_price: 38000, selling_price: 49990, gst_rate: 18, stock: 7, reorder: 3, warranty: 12, image: 'https://p4-ofp.static.pub/fes/cms/2023/01/31/d3skjuhi4wl80zy5mj3p99b44dwldr651785.png' },

  // Tablets
  { name: 'Samsung Galaxy Tab S9', category: 'Tablets', brand: 'Samsung', model: 'Galaxy Tab S9', variant: '128GB WiFi Graphite', sku: 'TAB-SAM-001', barcode: '8806095207643', cost_price: 58000, selling_price: 74999, gst_rate: 18, stock: 3, reorder: 2, warranty: 12, image: 'https://images.samsung.com/is/image/samsung/p6pim/in/sm-x710nzaainu/gallery/in-galaxy-tab-s9-wifi-sm-x710-sm-x710nzaainu-537176052' },

  // Accessories
  { name: 'Apple AirPods Pro 2', category: 'Accessories', brand: 'Apple', model: 'AirPods Pro 2', variant: 'USB-C White', sku: 'ACC-APL-001', barcode: '194253392941', cost_price: 19000, selling_price: 24900, gst_rate: 18, stock: 12, reorder: 5, warranty: 12, image: 'https://store.storeimages.cdn-apple.com/4668/as-images.apple.com/is/MQD83' },
  { name: 'Samsung 25W Charger', category: 'Accessories', brand: 'Samsung', model: 'EP-TA800', variant: 'USB-C White', sku: 'ACC-SAM-001', barcode: '8806090724565', cost_price: 800, selling_price: 1299, gst_rate: 18, stock: 30, reorder: 10, warranty: 6, image: 'https://images.samsung.com/is/image/samsung/p6pim/in/ep-ta800nwegin/gallery/in-travel-adapter-25w-ep-ta800-ep-ta800nwegin-361906649' },

  // Kitchen Appliances
  { name: 'Bosch TruMixx Joy', category: 'Kitchen Appliances', brand: 'Bosch', model: 'MGM4341GIN', variant: '500W 3 Jars Black', sku: 'KIT-BOS-001', barcode: '4242005267856', cost_price: 3500, selling_price: 4999, gst_rate: 18, stock: 8, reorder: 3, warranty: 24, image: 'https://media.bosch-home.com/Product_Shots/435x515/MGM4341GIN_def.png' },
];

export const SEED_CUSTOMERS = [
  { name: 'Rajesh Kumar', phone: '9876543210', email: 'rajesh@example.com', address: 'Chegunta, Telangana' },
  { name: 'Sita Devi', phone: '9876543211', address: 'Medchal, Telangana' },
  { name: 'Anil Reddy', phone: '9876543212', email: 'anil.reddy@gmail.com', address: 'Zaheerabad, Telangana' },
  { name: 'Priya Sharma', phone: '9876543213', address: 'Sangareddy, Telangana' },
  { name: 'Venkat Rao', phone: '9876543214', email: 'venkat.rao@yahoo.com', address: 'Chegunta, Telangana', gstin: '36AABCV1234E1Z5' },
];

/**
 * Category-based fallback images when no product-specific image is set
 * Uses free Unsplash images optimized at 200x200
 */
export const CATEGORY_IMAGES: Record<string, string> = {
  'Mobiles': 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=200&h=200&fit=crop',
  'TVs': 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=200&h=200&fit=crop',
  'Refrigerators': 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=200&h=200&fit=crop',
  'Washing Machines': 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=200&h=200&fit=crop',
  'Speakers & Audio': 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=200&h=200&fit=crop',
  'Air Conditioners': 'https://images.unsplash.com/photo-1625961332071-5c8a1e636264?w=200&h=200&fit=crop',
  'Laptops': 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=200&h=200&fit=crop',
  'Tablets': 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=200&h=200&fit=crop',
  'Accessories': 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&h=200&fit=crop',
  'Kitchen Appliances': 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=200&h=200&fit=crop',
};
