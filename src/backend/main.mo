import Map "mo:core/Map";
import Array "mo:core/Array";
import Time "mo:core/Time";
import Principal "mo:core/Principal";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Order "mo:core/Order";
import Text "mo:core/Text";
import List "mo:core/List";
import Runtime "mo:core/Runtime";
import Iter "mo:core/Iter";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";
import HttpOutcall "http-outcalls/outcall";

actor {
  type ProductCategory = {
    #incense;
    #book;
  };

  type Product = {
    id : Nat;
    name : Text;
    description : Text;
    priceCents : Nat;
    category : ProductCategory;
    imageUrl : Text;
    stockQuantity : Nat;
    isActive : Bool;
  };

  module Product {
    public func compare(product1 : Product, product2 : Product) : Order.Order {
      Nat.compare(product1.id, product2.id);
    };
  };

  type OrderItem = {
    productId : Nat;
    quantity : Nat;
    priceAtOrder : Nat;
  };

  type OrderStatus = {
    #pending;
    #processing;
    #shipped;
    #delivered;
    #cancelled;
  };

  type Order = {
    id : Nat;
    customerName : Text;
    customerEmail : Text;
    customerPhone : Text;
    shippingAddress : Text;
    items : [OrderItem];
    totalAmount : Nat;
    status : OrderStatus;
    createdAt : Time.Time;
    customerId : Principal;
  };

  func compare(order1 : Order, order2 : Order) : Order.Order {
    Nat.compare(order1.id, order2.id);
  };

  public type UserProfile = {
    name : Text;
    email : Text;
    phone : Text;
    address : Text;
  };

  // OTP record
  type OtpRecord = {
    otp : Text;
    expiresAt : Time.Time;
  };

  var nextProductId = 1;
  var nextOrderId = 1;

  let products = Map.empty<Nat, Product>();
  let orders = Map.empty<Nat, Order>();
  let userProfiles = Map.empty<Principal, UserProfile>();
  // Phone number registry: token -> phone number
  let phoneRegistry = Map.empty<Text, Text>();
  // OTP storage: phone -> OtpRecord
  let otpStore = Map.empty<Text, OtpRecord>();

  // Retained for upgrade compatibility (previously used for Fast2SMS)
  let fast2smsApiKey : Text = "O0MGa7ghKmN5AL4wvUyln3EzTs6pFWeC89jR1qVuo2tQIDJdSrALoqzYEH6wtm1XlQTBM4aS82fCRPUI";

  // OTP TTL: 2 minutes in nanoseconds
  let OTP_TTL_NS : Int = 2 * 60 * 1_000_000_000;

  // Authorization module instantiation
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // Pre-assign admin role to the store owner's Principal
  let ownerPrincipal = Principal.fromText("6yb43-vmf7k-bflbc-pu74g-uhytl-4ha37-gz7m3-imf7y-ovax2-7r4rr-eae");
  accessControlState.userRoles.add(ownerPrincipal, #admin);
  accessControlState.adminAssigned := true;

  // Transform function for HTTP outcalls
  public query func transform(input : HttpOutcall.TransformationInput) : async HttpOutcall.TransformationOutput {
    HttpOutcall.transform(input);
  };

  // Generate a 6-digit OTP from time-based entropy
  // Returns a 6-character text like "123456"
  func generateOtp() : Text {
    let t : Int = Time.now();
    let n : Nat = Int.abs(t % 900000) + 100000;
    n.toText();
  };

  // DEMO MODE: Send OTP without SMS - returns OTP in response for testing
  public shared func sendOtp(phone : Text) : async Text {
    if (phone.size() < 7 or phone.size() > 15) {
      Runtime.trap("Invalid phone number");
    };

    let otp = generateOtp();
    let expiresAt = Time.now() + OTP_TTL_NS;

    // Store OTP
    otpStore.add(phone, { otp; expiresAt });

    // Return OTP directly (demo mode - no SMS sent)
    "DEMO:" # otp
  };

  // Verify OTP
  public shared func verifyOtp(phone : Text, otp : Text) : async Text {
    switch (otpStore.get(phone)) {
      case (null) {
        Runtime.trap("No OTP found. Please request a new OTP.");
      };
      case (?record) {
        if (Time.now() > record.expiresAt) {
          otpStore.remove(phone);
          Runtime.trap("OTP has expired. Please request a new one.");
        };
        if (otp != record.otp) {
          Runtime.trap("Invalid OTP. Please try again.");
        };
        // Clear OTP on successful verification
        otpStore.remove(phone);
        "OTP verified successfully"
      };
    };
  };

  // Sample Products
  let sampleProducts : [Product] = [
    // Books
    {
      id = 1;
      name = "Bhagavad Gita As It Is";
      description = "The timeless wisdom of Krishna spoken to Arjuna on the battlefield of Kurukshetra.";
      priceCents = 599;
      category = #book;
      imageUrl = "https://example.com/bg.jpg";
      stockQuantity = 100;
      isActive = true;
    },
    {
      id = 2;
      name = "Srimad Bhagavatam";
      description = "The great Vedic scripture detailing the pastimes of Lord Krishna and His devotees.";
      priceCents = 1999;
      category = #book;
      imageUrl = "https://example.com/sb.jpg";
      stockQuantity = 50;
      isActive = true;
    },
    {
      id = 3;
      name = "Nectar of Devotion";
      description = "The philosophy and practices of pure devotional service to Krishna.";
      priceCents = 499;
      category = #book;
      imageUrl = "https://example.com/nod.jpg";
      stockQuantity = 80;
      isActive = true;
    },
    {
      id = 4;
      name = "Chaitanya Charitamrita";
      description = "The biography of Lord Chaitanya Mahaprabhu, the incarnation of Krishna for this age.";
      priceCents = 1499;
      category = #book;
      imageUrl = "https://example.com/cc.jpg";
      stockQuantity = 30;
      isActive = true;
    },
    {
      id = 5;
      name = "Krishna Book";
      description = "The summary study of the tenth canto of Srimad Bhagavatam, focusing on Krishna's pastimes.";
      priceCents = 799;
      category = #book;
      imageUrl = "https://example.com/krishna.jpg";
      stockQuantity = 70;
      isActive = true;
    },
    // Incense
    {
      id = 6;
      name = "Sandalwood Incense";
      description = "Premium quality sandalwood incense sticks for your altar and home.";
      priceCents = 299;
      category = #incense;
      imageUrl = "https://example.com/sandalwood.jpg";
      stockQuantity = 200;
      isActive = true;
    },
    {
      id = 7;
      name = "Rose Incense";
      description = "Fragrant rose incense sticks for a soothing and peaceful atmosphere.";
      priceCents = 199;
      category = #incense;
      imageUrl = "https://example.com/rose.jpg";
      stockQuantity = 150;
      isActive = true;
    },
    {
      id = 8;
      name = "Jasmine Incense";
      description = "Sweet jasmine incense sticks for a divine experience.";
      priceCents = 249;
      category = #incense;
      imageUrl = "https://example.com/jasmine.jpg";
      stockQuantity = 180;
      isActive = true;
    },
    {
      id = 9;
      name = "Nag Champa Incense";
      description = "Classic Nag Champa incense sticks used in many ISKCON temples.";
      priceCents = 349;
      category = #incense;
      imageUrl = "https://example.com/nagchampa.jpg";
      stockQuantity = 120;
      isActive = true;
    },
    {
      id = 10;
      name = "Tulsi Incense";
      description = "Sacred Tulsi incense sticks for Purity and devotion.";
      priceCents = 399;
      category = #incense;
      imageUrl = "https://example.com/tulsi.jpg";
      stockQuantity = 100;
      isActive = true;
    },
  ];

  // Initialize sample products
  for (product in sampleProducts.values()) {
    products.add(product.id, product);
  };

  nextProductId := 11;

  // Phone Number Registry - open to all callers (no auth required)
  public shared func savePhoneNumber(token : Text, phone : Text) : async () {
    if (token.size() < 8) {
      Runtime.trap("Token must be at least 8 characters");
    };
    if (phone.size() < 7) {
      Runtime.trap("Phone number too short");
    };
    phoneRegistry.add(token, phone);
  };

  public query func getPhoneNumber(token : Text) : async ?Text {
    phoneRegistry.get(token);
  };

  // User Profile Functions
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // ADMIN - Add Product
  public shared ({ caller }) func addProduct(product : Product) : async Product {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can add products");
    };
    let newProduct = {
      product with
      id = nextProductId;
      isActive = true;
    };
    products.add(nextProductId, newProduct);
    nextProductId += 1;
    newProduct;
  };

  // ADMIN - Update Product
  public shared ({ caller }) func updateProduct(id : Nat, product : Product) : async Product {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can update products");
    };
    if (id != product.id) {
      Runtime.trap("Id in path and product must match");
    };
    if (not products.containsKey(id)) {
      Runtime.trap("Product does not exist");
    };
    products.add(id, product);
    product;
  };

  // ADMIN - Delete Product (Soft Delete)
  public shared ({ caller }) func deleteProduct(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can delete products");
    };
    let product = switch (products.get(id)) {
      case (null) { Runtime.trap("Product does not exist") };
      case (?p) { { p with isActive = false } };
    };
    products.add(id, product);
  };

  // Get Product by ID - Public access
  public query func getProduct(id : Nat) : async Product {
    if (not products.containsKey(id)) {
      Runtime.trap("Product does not exist");
    };
    switch (products.get(id)) {
      case (null) { Runtime.trap("Product does not exist") };
      case (?product) { product };
    };
  };

  // Get all active products - Public access
  public query func getAllActiveProducts() : async [Product] {
    products.values().toArray().filter(func(product) { product.isActive });
  };

  // Get products by category - Public access
  public query func getProductsByCategory(category : ProductCategory) : async [Product] {
    products.values().toArray().filter(func(product) { product.category == category and product.isActive });
  };

  // Place Order - Public access (anyone can place an order)
  public shared ({ caller }) func placeOrder(order : Order) : async Nat {
    let validatedItems = List.empty<OrderItem>();
    var totalAmount = 0;
    for (item in order.items.values()) {
      switch (products.get(item.productId)) {
        case (null) { Runtime.trap("Product does not exist") };
        case (?product) {
          if (not product.isActive) {
            Runtime.trap("Product is not available");
          };
          if (item.quantity == 0) {
            Runtime.trap("Quantity must be at least 1");
          };
          if (product.stockQuantity < item.quantity) {
            Runtime.trap("Insufficient stock for product: " # product.name);
          };
          totalAmount += product.priceCents * item.quantity;
          validatedItems.add(
            {
              productId = product.id;
              quantity = item.quantity;
              priceAtOrder = product.priceCents;
            },
          );
        };
      };
    };

    let newOrder : Order = {
      order with
      id = nextOrderId;
      items = validatedItems.toArray();
      totalAmount;
      status = #pending;
      createdAt = Time.now();
      customerId = caller;
    };
    orders.add(nextOrderId, newOrder);

    for (item in validatedItems.toArray().values()) {
      switch (products.get(item.productId)) {
        case (null) { Runtime.trap("Product does not exist") };
        case (?product) {
          let updatedProduct : Product = {
            product with
            stockQuantity = product.stockQuantity - item.quantity;
          };
          products.add(product.id, updatedProduct);
        };
      };
    };

    nextOrderId += 1;
    newOrder.id;
  };

  // ADMIN - Get All Orders
  public query ({ caller }) func getAllOrders() : async [Order] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can get all orders");
    };
    orders.values().toArray().sort();
  };

  // Get Order by ID
  public query ({ caller }) func getOrder(id : Nat) : async Order {
    switch (orders.get(id)) {
      case (null) { Runtime.trap("Order does not exist") };
      case (?order) {
        if (caller != order.customerId and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Can only view your own orders");
        };
        order;
      };
    };
  };

  // ADMIN - Update Order Status
  public shared ({ caller }) func updateOrderStatus(id : Nat, status : OrderStatus) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can update order status");
    };
    let updatedOrder = switch (orders.get(id)) {
      case (null) { Runtime.trap("Order does not exist") };
      case (?order) { { order with status } };
    };
    orders.add(id, updatedOrder);
  };
};
