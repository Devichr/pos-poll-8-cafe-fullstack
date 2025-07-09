import { useState, useEffect } from 'react'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Coffee, 
  ShoppingCart, 
  CreditCard,
  Search,
  Package,
  Clock
} from 'lucide-react'
import { getAuthHeaders } from '../utils/auth'
declare global {
  interface Window {
    snap: {
      pay: (
        token: string,
        options?: {
          onSuccess?: (result: any) => void;
          onPending?: (result: any) => void;
          onError?: (result: any) => void;
          onClose?: () => void;
        }
      ) => void;
    };
  }
}


interface Category {
  id: number
  name: string
  products?: Product[]
}

interface Product {
  id: number
  name: string
  description?: string
  price: number
  categoryId: number
  imgurl: string
  category?: Category
}

interface OrderItem {
  productId: number
  quantity: number
  product?: Product
}

interface Order {
  id: number
  customerName?: string
  totalAmount: number
  createdAt: string
  orderItems: {
    id: number
    quantity: number
    price: number
    product: Product
  }[]
}

export default function Cafe() {
  const [activeTab, setActiveTab] = useState<'menu' | 'orders' | 'pos'>('pos')
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [cart, setCart] = useState<OrderItem[]>([])
  const [customerName, setCustomerName] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Modal states
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [showProductModal, setShowProductModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  // Form states
  const [categoryForm, setCategoryForm] = useState({ name: '' })
const [midtransConfig, setMidtransConfig] = useState<{ clientKey: string; isProduction: false } | null>(null);

const API = {
  createPayment: async ({ orderId }: { orderId: number }) => {
    const response = await fetch(`http://localhost:5500/payment/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ orderId })
    });
    if (!response.ok) throw new Error('Failed to create payment');
    return response.json();
  }
};

  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: 0,
    categoryId: 0,
    imgurl: '',
  })

  useEffect(() => {
    fetchCategories()
    fetchProducts()
    fetchOrders()
  }, [])

  const fetchCategories = async () => {
    try {
      const response = await fetch('http://localhost:5500/categories')
      if (response.ok) {
        const data = await response.json()
        setCategories(data.categories)
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    }
  }

  const fetchProducts = async () => {
    try {
      const response = await fetch('http://localhost:5500/products')
      if (response.ok) {
        const data = await response.json()
        setProducts(data.products)
      }
    } catch (error) {
      console.error('Failed to fetch products:', error)
    }
  }

  const fetchOrders = async () => {
    try {
      const response = await fetch('http://localhost:5500/orders', {
        headers: getAuthHeaders()
      })
      if (response.ok) {
        const data = await response.json()
        setOrders(data.orders)
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error)
    }
  }

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id)
      if (existing) {
        return prev.map(item =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [...prev, { productId: product.id, quantity: 1, product }]
    })
  }

  const updateCartQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      setCart(prev => prev.filter(item => item.productId !== productId))
    } else {
      setCart(prev =>
        prev.map(item =>
          item.productId === productId ? { ...item, quantity } : item
        )
      )
    }
  }

  const getCartTotal = () => {
    return cart.reduce((total, item) => {
      const product = products.find(p => p.id === item.productId)
      return total + (product ? parseFloat(product.price.toString()) * item.quantity : 0)
    }, 0)
  }

 const createOrder = async () => {
  if (cart.length === 0) {
    setError('Cart is empty');
    return;
  }

  setIsLoading(true);
  setError('');
  setSuccess('');

  try {
    const response = await fetch('http://localhost:5500/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({
        customerName: customerName || undefined,
        items: cart.map(item => ({
          productId: item.productId,
          quantity: item.quantity
        }))
      })
    });

    const data = await response.json();

    if (response.ok) {
      setSuccess('Order created successfully');
      setCart([]);
      setCustomerName('');
      fetchOrders();

      if (data?.order?.id) {
        await handlePayment(data.order.id); // Pastikan ada orderId
      } else {
        setError('Failed to retrieve order ID for payment.');
      }
    } else {
      setError(data?.error || 'Failed to create order');
    }
  } catch (error) {
    setError('Network error. Please try again.');
  } finally {
    setIsLoading(false);
  }
};
// Load Midtrans configuration
const loadMidtransConfig = async () => {
  try {
    const response = await fetch('http://localhost:5500/payment/config', {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error('Failed to load Midtrans config');
    }
    const data = await response.json();
    setMidtransConfig(data);
    return data; // Return config for immediate use if needed
  } catch (error) {
    console.error('Error loading Midtrans config:', error);
    setError('Failed to load payment configuration');
    return null;
  }
};

// Load Midtrans Snap script
const loadMidtransScript = (clientKey: string, isProduction: boolean) => {
  return new Promise<void>((resolve, reject) => {
    if (window.snap) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = isProduction
      ? 'https://app.midtrans.com/snap/snap.js'
      : 'https://app.sandbox.midtrans.com/snap/snap.js';
    script.setAttribute('data-client-key', clientKey);
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Midtrans script'));
    document.head.appendChild(script);
  });
};

// Handle payment with Midtrans
const handlePayment = async (orderId: number) => {
  setIsLoading(true);
  setError('');
  try {
    // Load Midtrans config if not already loaded
    let config = midtransConfig;
    if (!config) {
      config = await loadMidtransConfig();
      if (!config?.clientKey) {
        throw new Error('Midtrans configuration not available');
      }
    }

    // Load Midtrans script
    await loadMidtransScript(config.clientKey, config.isProduction);

    // Create payment
    const paymentResponse = await fetch('http://localhost:5500/payment/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({
        paymentType: 'Order',
        orderId: orderId,
      }),
    });

    if (!paymentResponse.ok) {
      const errorData = await paymentResponse.json();
      throw new Error(errorData?.error || 'Failed to create payment');
    }

    const paymentData = await paymentResponse.json();

    if (!paymentData?.token) {
      throw new Error('Invalid payment token received');
    }

    // Open Midtrans payment popup
    window.snap.pay(paymentData.token, {
      onSuccess: (result) => {
        console.log('Payment success:', result);
        setSuccess('Payment completed successfully');
        fetchOrders(); // Refresh orders after successful payment
      },
      onPending: (result) => {
        console.log('Payment pending:', result);
        setSuccess('Payment is pending. Please check status later.');
      },
      onError: (result) => {
        console.error('Payment error:', result);
        setError('Payment failed. Please try again.');
      },
      onClose: () => {
        console.log('Payment popup closed');
        setSuccess('Payment popup closed. Please complete the payment.');
      },
    });
  } catch (error) {
    console.error('Payment error:', error);
    setError('An error occurred during payment processing');
  } finally {
    setIsLoading(false);
  }
};

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory ? product.categoryId === selectedCategory : true
    return matchesSearch && matchesCategory
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR'
    }).format(amount)
  }

  // Handler untuk kategori
  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    try {
      const method = editingCategory ? 'PUT' : 'POST'
      const url = editingCategory
        ? `http://localhost:5500/categories/${editingCategory.id}`
        : 'http://localhost:5500/categories'
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ name: categoryForm.name })
      })
      if (response.ok) {
        setShowCategoryModal(false)
        setEditingCategory(null)
        setCategoryForm({ name: '' })
        fetchCategories()
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to save category')
      }
    } catch {
      setError('Network error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteCategory = async (categoryId: number) => {
    if (!confirm('Delete this category?')) return
    setIsLoading(true)
    try {
      const response = await fetch(`http://localhost:5500/categories/${categoryId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      })
      if (response.ok) fetchCategories()
    } finally {
      setIsLoading(false)
    }
  }

  // Handler untuk produk
  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    try {
      const method = editingProduct ? 'PUT' : 'POST'
      const url = editingProduct
        ? `http://localhost:5500/products/${editingProduct.id}`
        : 'http://localhost:5500/products'
      // Kirim imgurl ke backend
      const payload = {
        ...productForm,
        imgurl: productForm.imgurl // pastikan imgurl dikirim
      }
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(payload)
      })
      if (response.ok) {
        setShowProductModal(false)
        setEditingProduct(null)
        setProductForm({ name: '', description: '', price: 0, categoryId: 0, imgurl: '' })
        fetchProducts()
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to save product')
      }
    } catch {
      setError('Network error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteProduct = async (productId: number) => {
    if (!confirm('Delete this product?')) return
    setIsLoading(true)
    try {
      const response = await fetch(`http://localhost:5500/products/${productId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      })
      if (response.ok) fetchProducts()
    } finally {
      setIsLoading(false)
    }
  }

  // Fungsi untuk handle file gambar, simpan ke imgurl (base64)
  const handleProductImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => {
      setProductForm(prev => ({
        ...prev,
        imgurl: reader.result as string // simpan ke imgurl
      }))
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Coffee className="h-8 w-8 text-green-600" />
          <h1 className="text-3xl font-bold text-gray-900">Cafe Management</h1>
        </div>
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          {[
            { id: 'pos', label: 'POS', icon: ShoppingCart },
            { id: 'menu', label: 'Menu', icon: Package },
            { id: 'orders', label: 'Orders', icon: Clock }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition ${
                activeTab === id
                  ? 'bg-white text-green-600 shadow'
                  : 'text-gray-600 hover:text-green-600'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
          {success}
        </div>
      )}

      {/* POS Tab */}
      {activeTab === 'pos' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Products */}
          <div className="lg:col-span-2 space-y-4">
            {/* Search and Filter */}
            <div className="flex space-x-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
                />
              </div>
              <select
                value={selectedCategory || ''}
                onChange={(e) => setSelectedCategory(e.target.value ? parseInt(e.target.value) : null)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Product Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {filteredProducts.map(product => (
                <div
                  key={product.id}
                  className="bg-white rounded-lg shadow p-4 hover:shadow-md transition cursor-pointer"
                  onClick={() => addToCart(product)}
                >
                  {/* Tampilkan gambar dari imgurl jika ada */}
                  {product.imgurl && (
                    <img
                      src={product.imgurl}
                      alt={product.name}
                      className="w-full aspect-square object-cover rounded mb-2"
                    />
                  )}
                  <h3 className="font-medium text-gray-900 truncate">{product.name}</h3>
                  <p className="text-sm text-gray-500 truncate">{product.description}</p>
                  <p className="text-lg font-bold text-green-600 mt-2">
                    {formatCurrency(parseFloat(product.price.toString()))}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Cart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Current Order</h2>
            
            {/* Customer Name */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Customer Name (Optional)
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Enter customer name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
              />
            </div>

            {/* Cart Items */}
            <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
              {cart.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Cart is empty</p>
              ) : (
                cart.map(item => {
                  const product = products.find(p => p.id === item.productId)
                  if (!product) return null
                  
                  return (
                    <div key={item.productId} className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{product.name}</h4>
                        <p className="text-sm text-gray-500">
                          {formatCurrency(parseFloat(product.price.toString()))}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => updateCartQuantity(item.productId, item.quantity - 1)}
                          className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"
                        >
                          -
                        </button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateCartQuantity(item.productId, item.quantity + 1)}
                          className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Total */}
            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-4">
                <span className="text-lg font-semibold">Total:</span>
                <span className="text-xl font-bold text-green-600">
                  {formatCurrency(getCartTotal())}
                </span>
              </div>
              
              <button
                onClick={createOrder}
                disabled={cart.length === 0 || isLoading}
                className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CreditCard className="h-4 w-4" />
                <span>{isLoading ? 'Processing...' : 'Create Order & Pay'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Menu Management Tab */}
      {activeTab === 'menu' && (
        <div className="space-y-6">
          {/* Categories Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Categories</h2>
              <button
                onClick={() => setShowCategoryModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                <Plus className="h-4 w-4" />
                <span>Add Category</span>
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {categories.map(category => (
                <div key={category.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-900">{category.name}</h3>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setEditingCategory(category)
                          setCategoryForm({ name: category.name })
                          setShowCategoryModal(true)
                        }}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(category.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Products Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Products</h2>
              <button
                onClick={() => setShowProductModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                <Plus className="h-4 w-4" />
                <span>Add Product</span>
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map(product => (
                <div key={product.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      {/* Tampilkan gambar dari imgurl jika ada */}
                      {product.imgurl && (
                        <img
                          src={product.imgurl}
                          alt={product.name}
                          className="w-full aspect-square object-cover rounded mb-2"
                        />
                      )}
                      <h3 className="font-medium text-gray-900">{product.name}</h3>
                      <p className="text-sm text-gray-500">{product.description}</p>
                      <p className="text-lg font-bold text-green-600 mt-1">
                        {formatCurrency(parseFloat(product.price.toString()))}
                      </p>
                      <p className="text-xs text-gray-400">
                        {product.category?.name}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setEditingProduct(product)
                          setProductForm({
                            name: product.name,
                            description: product.description || '',
                            price: parseFloat(product.price.toString()),
                            categoryId: product.categoryId,
                            imgurl: product.imgurl || ''
                          })
                          setShowProductModal(true)
                        }}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-900">Recent Orders</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Items
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orders.map(order => (
                  <tr key={order.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{order.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.customerName || 'Walk-in Customer'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {order.orderItems.map(item => (
                        <div key={item.id}>
                          {item.quantity}x {item.product.name}
                        </div>
                      ))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                      {formatCurrency(parseFloat(order.totalAmount.toString()))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <form
            onSubmit={handleCategorySubmit}
            className="bg-white rounded-lg p-6 w-full max-w-sm space-y-4 shadow"
          >
            <h3 className="text-lg font-semibold mb-2">
              {editingCategory ? 'Edit Category' : 'Add Category'}
            </h3>
            <input
              type="text"
              required
              placeholder="Category name"
              value={categoryForm.name}
              onChange={e => setCategoryForm({ name: e.target.value })}
              className="w-full px-3 py-2 border rounded"
            />
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => {
                  setShowCategoryModal(false)
                  setEditingCategory(null)
                  setCategoryForm({ name: '' })
                }}
                className="px-4 py-2 rounded bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded bg-green-600 text-white"
                disabled={isLoading}
              >
                {isLoading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <form
            onSubmit={handleProductSubmit}
            className="bg-white rounded-lg p-6 w-full max-w-md space-y-4 shadow"
          >
            <h3 className="text-lg font-semibold mb-2">
              {editingProduct ? 'Edit Product' : 'Add Product'}
            </h3>
            <input
              type="text"
              required
              placeholder="Product name"
              value={productForm.name}
              onChange={e => setProductForm({ ...productForm, name: e.target.value })}
              className="w-full px-3 py-2 border rounded"
            />
            <textarea
              placeholder="Description"
              value={productForm.description}
              onChange={e => setProductForm({ ...productForm, description: e.target.value })}
              className="w-full px-3 py-2 border rounded"
            />
            <input
              type="number"
              required
              placeholder="Price"
              value={productForm.price}
              onChange={e => setProductForm({ ...productForm, price: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 border rounded"
            />
            <select
              required
              value={productForm.categoryId}
              onChange={e => setProductForm({ ...productForm, categoryId: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="">Select Category</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            {/* Input gambar */}
            <input
              type="file"
              accept="image/*"
              onChange={handleProductImageChange}
              className="w-full px-3 py-2 border rounded"
            />
            {/* Preview gambar */}
            {productForm.imgurl && (
              <img
                src={productForm.imgurl}
                alt="Preview"
                className="w-full aspect-square object-cover rounded"
              />
            )}
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => {
                  setShowProductModal(false)
                  setEditingProduct(null)
                  setProductForm({ name: '', description: '', price: 0, categoryId: 0, imgurl: '' })
                }}
                className="px-4 py-2 rounded bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded bg-green-600 text-white"
                disabled={isLoading}
              >
                {isLoading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
