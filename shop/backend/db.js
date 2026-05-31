const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'db.json');

// Default initial data
const initialData = {
  users: [],
  orders: [],
  products: [
    {
      id: "1",
      name: "AeroSound Max Headphones",
      category: "Audio",
      price: 24999,
      image: "assets/headphones.png",
      description: "Premium wireless over-ear headphones with hybrid active noise cancellation, spatial audio, and up to 40 hours of battery life. Designed for audiophiles who demand pure, uninterrupted sound quality.",
      specs: {
        "Driver Size": "40mm Dynamic",
        "Battery Life": "Up to 40 Hours (ANC On)",
        "Bluetooth Version": "5.2 (Multipoint)",
        "Weight": "250g",
        "ANC": "Hybrid Active Noise Cancellation",
        "Charging Port": "USB-C Fast Charge"
      },
      features: [
        "Hybrid Active Noise Cancellation blocking up to 38dB",
        "Spatial Audio with dynamic head tracking for theater-like sound",
        "Dual-device Bluetooth connectivity for seamless switching",
        "Rapid charge: 10 mins charging gives 5 hours of playback",
        "Ultra-soft memory foam earcups for all-day comfort"
      ],
      rating: 4.8,
      reviewsCount: 124,
      stock: 12
    },
    {
      id: "2",
      name: "Chronos Fit X Smartwatch",
      category: "Wearables",
      price: 15999,
      image: "assets/smartwatch.png",
      description: "Next-generation smartwatch with a vibrant circular OLED display, dynamic health monitoring, and built-in multi-system GPS. Tracks fitness metrics, heart rate, sleep quality, and keeps you connected on the go.",
      specs: {
        "Display": "1.43-inch AMOLED (Always-on)",
        "Battery Life": "Up to 7 Days (Typical Use)",
        "Water Resistance": "5 ATM (50 meters)",
        "Sensors": "Heart Rate, SpO2 Blood Oxygen, Accelerometer, Gyroscope",
        "GPS": "Built-in GPS / GLONASS / Galileo",
        "Case Material": "Black Aerospace-Grade Aluminum"
      },
      features: [
        "Vibrant Circular AMOLED screen with 1000 nits brightness",
        "24/7 continuous heart rate and SpO2 tracking",
        "Advanced sleep score and recovery monitoring metrics",
        "120+ specialized sport and workout modes",
        "Receive calls, texts, and app notifications directly"
      ],
      rating: 4.6,
      reviewsCount: 88,
      stock: 25
    },
    {
      id: "3",
      name: "Vortex Neon Keyboard",
      category: "Accessories",
      price: 12499,
      image: "assets/keyboard.png",
      description: "Tenkeyless mechanical gaming keyboard with ultra-responsive linear switches, customized RGB backlighting, and a premium solid aluminum faceplate. Features hot-swappable sockets for easy personalization.",
      specs: {
        "Switches": "Vortex Linear Red (Hot-swappable)",
        "Layout": "TKL (80% Form Factor)",
        "Backlight": "Per-key Dynamic RGB",
        "Connectivity": "Detachable Braided USB-C",
        "Keycaps": "Double-shot PBT (No-fade)",
        "Polling Rate": "1000Hz (1ms response)"
      },
      features: [
        "Hot-swappable switch sockets supporting 3-pin and 5-pin switches",
        "Stunning per-key RGB backlighting with 18 onboard animations",
        "Acoustic dampening foam layers for satisfying click sounds",
        "Double-shot PBT keycaps resist shine and wear over time",
        "Full N-Key Rollover and 100% Anti-Ghosting precision"
      ],
      rating: 4.7,
      reviewsCount: 142,
      stock: 8
    },
    {
      id: "4",
      name: "Apex Glide Mouse",
      category: "Accessories",
      price: 6499,
      image: "assets/mouse.png",
      description: "Lightweight ergonomic wireless gaming mouse designed for ultimate comfort and rapid reflexes. Features an advanced 26K DPI optical sensor and dual wireless connectivity options.",
      specs: {
        "DPI Range": "100 - 26,000 DPI",
        "Sensor": "Apex Precision Optical",
        "Battery Life": "Up to 100 Hours (2.4GHz) / 140 Hours (BT)",
        "Weight": "65g Ultra-lightweight",
        "Buttons": "6 Programmable Buttons",
        "Switches": "Optical Mouse Switches (90M Clicks)"
      },
      features: [
        "Featherlight 65g design without honeycomb holes",
        "Zero-lag 2.4GHz wireless connection plus Bluetooth standby",
        "Optical switches eliminate double-clicking issues",
        "Premium PTFE glider feet for effortless mouse drag",
        "Onboard profile storage for custom macros and DPI stages"
      ],
      rating: 4.9,
      reviewsCount: 205,
      stock: 19
    },
    {
      id: "5",
      name: "Sonic Boom Speaker",
      category: "Audio",
      price: 9999,
      image: "assets/speaker.png",
      description: "Rugged, waterproof portable Bluetooth speaker delivering massive 360-degree stereo sound and deep rumbling bass. Perfect for outdoor adventures, pool parties, or home audio setups.",
      specs: {
        "Output Power": "30W RMS (Dual Speakers + Passive Radiators)",
        "Battery Life": "Up to 15 Hours (Variable Volume)",
        "IP Rating": "IP67 Waterproof and Dustproof",
        "Sound Projection": "360-degree Stereo Audio",
        "Bluetooth Range": "Up to 100 feet (Bluetooth 5.0)",
        "Audio Inputs": "Bluetooth, 3.5mm Aux-in"
      },
      features: [
        "Completely waterproof and dustproof - floats on water",
        "Dual passive radiators pump out deep, distortion-free bass",
        "PartySync: Connect 100+ speakers for synchronized stadium sound",
        "Durable drop-resistant exterior rubber armor wrap",
        "Built-in microphone for hands-free crystal-clear speakerphone calls"
      ],
      rating: 4.5,
      reviewsCount: 95,
      stock: 15
    },
    {
      id: "6",
      name: "Horizon Vue 34 Monitor",
      category: "Displays",
      price: 41999,
      image: "assets/monitor.png",
      description: "Immersive 34-inch curved ultra-wide display featuring cinematic UWQHD resolution, high refresh rate, and professional color accuracy. Ideal for productivity multitaskers and intense gaming sessions.",
      specs: {
        "Screen Size": "34-inch Curved (1500R curvature)",
        "Resolution": "3440 x 1440 (UWQHD, 21:9 aspect ratio)",
        "Refresh Rate": "144Hz (Adaptive Sync supported)",
        "Response Time": "1ms MPRT",
        "Panel Type": "Super VA with High Contrast",
        "Ports": "2x HDMI 2.0, 2x DisplayPort 1.4, Audio Out"
      },
      features: [
        "1500R curvature matches the natural contours of the human eye",
        "Cinematic UWQHD resolution offers 34% more viewing area",
        "144Hz high refresh rate eliminates screen tearing and ghosting",
        "99% sRGB color gamut with HDR10 support for vivid realism",
        "Height, tilt, and swivel adjustable ergonomic mount stand"
      ],
      rating: 4.8,
      reviewsCount: 67,
      stock: 5
    },
    {
      id: "7",
      name: "Nest Aura Smart Display",
      category: "Smart Home",
      price: 10999,
      image: "assets/smartdisplay.png",
      description: "Sleek smart assistant display with a vibrant 7-inch touchscreen, hands-free voice control, smart home central dashboard, and stereo speakers. Designed to organize your day and manage your smart home appliances.",
      specs: {
        "Display": "7-inch HD Touchscreen (Auto-brightness)",
        "Camera": "5MP Front-Facing with privacy shutter",
        "Audio": "Full-range speaker with 3-mic voice array",
        "Connectivity": "Wi-Fi 5 (802.11ac) & Bluetooth 5.0",
        "Compatibility": "Alexa, Google Assistant, SmartThings",
        "Power": "12W DC Wall Adapter"
      },
      features: [
        "Vibrant touchscreen automatically adapts to ambient room lighting",
        "Control lights, thermostats, locks, and cameras in one interface",
        "Video calling, digital photo frame slideshow, and recipe guides",
        "Physical camera shutter and microphone mute switch for privacy",
        "Rich speaker output for morning news and ambient music playlists"
      ],
      rating: 4.4,
      reviewsCount: 110,
      stock: 14
    },
    {
      id: "8",
      name: "Lumina Snap Mirrorless Camera",
      category: "Photography",
      price: 59999,
      image: "assets/camera.png",
      description: "Retro-styled mirrorless digital camera combining classic retro design aesthetics with an advanced 24.2MP sensor and UHD 4K video recording. Captures crystal-clear images and streams high-definition video.",
      specs: {
        "Sensor Size": "24.2 Megapixel APS-C CMOS Sensor",
        "Lens System": "Lumina E-Mount (Includes 16-50mm kit lens)",
        "Video Quality": "UHD 4K at 30fps / 1080p at 120fps (slow-motion)",
        "ISO Sensitivity": "100 - 25,600 (Expandable to 51,200)",
        "Autofocus": "425-point Hybrid Phase & Contrast AF",
        "Connectivity": "Wi-Fi, Bluetooth, Micro HDMI, USB-C"
      },
      features: [
        "Vintaged brushed magnesium-alloy chassis with textured leather trim",
        "Real-time Eye Autofocus tracking for humans and animals",
        "3-inch tilting LCD touchscreen for selfies and vlogging angles",
        "Built-in wireless sharing connects to smartphones instantly",
        "Webcam mode: plug directly into PC via USB-C for live streaming"
      ],
      rating: 4.9,
      reviewsCount: 53,
      stock: 4
    },
    {
      id: "9",
      name: "AeroBuds Pro Wireless Earbuds",
      category: "Audio",
      price: 8999,
      image: "assets/headphones.png",
      description: "Ultra-compact active noise cancelling wireless earbuds with high-fidelity sound, secure custom fit, and sweat-resistant protection. Includes a smart charging case with quick wireless charge capabilities.",
      specs: {
        "Driver Size": "11mm Dynamic",
        "Battery Life": "Up to 30 Hours (with Case)",
        "Bluetooth Version": "5.3 (LE Audio)",
        "Water Resistance": "IPX4 Sweatproof",
        "ANC": "Active Noise Cancellation",
        "Charging Port": "Wireless + USB-C"
      },
      features: [
        "Smart Active Noise Cancellation adapts to external environments",
        "Dual-beamforming microphones for crystal-clear hands-free calls",
        "Touch controls on both earbuds for volume, play, and calls",
        "Ultra-light ergonomic ear tips in 3 sizes for all-day comfort",
        "10-min charge provides up to 2 hours of audio listening"
      ],
      rating: 4.6,
      reviewsCount: 231,
      stock: 35
    },
    {
      id: "10",
      name: "Lumina RGB Smart LED Panel",
      category: "Smart Home",
      price: 7999,
      image: "assets/smartdisplay.png",
      description: "Modular smart light panels featuring over 16 million colors, custom animations, and rhythmic music syncing capabilities. Syncs with smart home devices to create immersive ambient lighting environments.",
      specs: {
        "Color Palette": "16M+ Colors",
        "Max Brightness": "80 Lumens per panel",
        "Connectivity": "Wi-Fi (2.4 GHz) + Bluetooth",
        "Control Modes": "App, Voice, Physical Remote",
        "Integration": "Google Home, Alexa, Apple HomeKit",
        "Power Supply": "24W Power Adapter"
      },
      features: [
        "Interactive music visualizer transforms beats into light animations",
        "Modular layout lets you design custom shapes on your wall",
        "Scheduling and smart scenes to match your morning and night routines",
        "Rich HSL color settings with smooth gradient transitions",
        "Simple peel-and-stick mounting tape installation included"
      ],
      rating: 4.5,
      reviewsCount: 64,
      stock: 18
    },
    {
      id: "11",
      name: "Quantum VR Quest Headset",
      category: "Wearables",
      price: 34999,
      image: "assets/smartwatch.png",
      description: "All-in-one standalone virtual reality headset featuring high-resolution lenses, integrated positional audio, and intuitive hand tracking. Dive into gaming, virtual meetups, and immersive entertainment.",
      specs: {
        "Display Type": "Dual LCD Panels (Fast-switch)",
        "Resolution": "1832 x 1920 per eye",
        "Refresh Rate": "90Hz - 120Hz supported",
        "Storage Capacity": "128GB High-Speed Flash",
        "Processor": "Qualcomm Snapdragon XR2 Gen 1",
        "Tracking": "Inside-out 6DoF tracking"
      },
      features: [
        "Standalone wireless headset — no PC or external cables required",
        "Vibrant 3D cinematic audio directly built into the strap",
        "Dual touch controllers with advanced haptic feedback responses",
        "Guardian boundary setup prevents collisions with furniture",
        "Link option to connect to gaming PC for advanced VR library"
      ],
      rating: 4.8,
      reviewsCount: 154,
      stock: 10
    },
    {
      id: "12",
      name: "Nomad Multi-Charge Pad",
      category: "Accessories",
      price: 4499,
      image: "assets/mouse.png",
      description: "Premium magnetic wireless charging pad that charges up to three devices simultaneously. Features a sleek leather top surface, anti-slip rubber feet, and fast-charge technology.",
      specs: {
        "Total Output": "30W Max (15W wireless per coil)",
        "Materials": "Aircraft Aluminum & Premium Leather",
        "Dimensions": "20cm x 10cm x 1.2cm",
        "Coil Count": "3 Overlapping Qi Coils",
        "Power Input": "USB-C PD Adapter (30W)",
        "Compatible Devices": "Smartphones, Earbuds, Smartwatches"
      },
      features: [
        "Charges your phone, smartwatch, and wireless earbuds all at once",
        "Overlapping multi-coil alignment allows drop-and-go placement",
        "Sleek aerospace-grade aluminum base with premium padded leather",
        "Built-in temperature control and foreign object detection safeguards",
        "Includes a premium 1.5m braided USB-C power cord"
      ],
      rating: 4.7,
      reviewsCount: 89,
      stock: 22
    }
  ]
};

// Database read/write helpers
function readDB() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      writeDB(initialData);
      return initialData;
    }
    const rawData = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(rawData);
  } catch (error) {
    console.error("Error reading database file, returning default initial data:", error);
    return initialData;
  }
}

function writeDB(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error("Error writing database file:", error);
  }
}

module.exports = {
  getProducts: () => {
    const db = readDB();
    return db.products;
  },
  getProductById: (id) => {
    const db = readDB();
    return db.products.find(p => p.id === id);
  },
  findUserByEmail: (email) => {
    const db = readDB();
    return db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  },
  createUser: (user) => {
    const db = readDB();
    const newUser = {
      id: Date.now().toString(),
      name: user.name,
      email: user.email.toLowerCase(),
      password: user.password, // hashed password will be passed in
      createdAt: new Date().toISOString()
    };
    db.users.push(newUser);
    writeDB(db);
    return { id: newUser.id, name: newUser.name, email: newUser.email };
  },
  getUsers: () => {
    const db = readDB();
    return db.users.map(u => ({ id: u.id, name: u.name, email: u.email, createdAt: u.createdAt }));
  },
  getOrders: () => {
    const db = readDB();
    return db.orders || [];
  },
  createOrder: (order) => {
    const db = readDB();
    if (!db.orders) db.orders = [];
    const newOrder = {
      id: order.id,
      date: order.date,
      status: order.status,
      items: order.items,
      shippingDetails: order.shippingDetails,
      paymentDetails: order.paymentDetails,
      pricing: order.pricing,
      deliveryDate: order.deliveryDate,
      userEmail: order.userEmail,
      userId: order.userId
    };
    db.orders.push(newOrder);
    writeDB(db);
    return newOrder;
  },
  updateOrderStatus: (id, updateData) => {
    const db = readDB();
    if (!db.orders) return null;
    const orderIndex = db.orders.findIndex(o => o.id === id);
    if (orderIndex === -1) return null;
    db.orders[orderIndex] = {
      ...db.orders[orderIndex],
      ...updateData
    };
    writeDB(db);
    return db.orders[orderIndex];
  },
  createProduct: (product) => {
    const db = readDB();
    const newProduct = {
      id: Date.now().toString(),
      name: product.name,
      category: product.category,
      price: Number(product.price),
      image: product.image || "assets/headphones.png",
      description: product.description,
      specs: product.specs || {},
      features: product.features || [],
      rating: 4.5,
      reviewsCount: 1,
      stock: Number(product.stock)
    };
    db.products.push(newProduct);
    writeDB(db);
    return newProduct;
  },
  updateProduct: (id, productData) => {
    const db = readDB();
    const idx = db.products.findIndex(p => p.id === id);
    if (idx === -1) return null;
    db.products[idx] = {
      ...db.products[idx],
      ...productData,
      price: productData.price !== undefined ? Number(productData.price) : db.products[idx].price,
      stock: productData.stock !== undefined ? Number(productData.stock) : db.products[idx].stock
    };
    writeDB(db);
    return db.products[idx];
  },
  deleteProduct: (id) => {
    const db = readDB();
    const idx = db.products.findIndex(p => p.id === id);
    if (idx === -1) return false;
    db.products.splice(idx, 1);
    writeDB(db);
    return true;
  }
};
