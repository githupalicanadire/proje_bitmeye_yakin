import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import './AdminPanel.css';

const AdminPanel = () => {
  const { user, isAuthenticated, getUserRoles } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    imageFile: ''
  });

  // Check if user is admin
  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login');
      return;
    }
    
    const userRoles = getUserRoles();
    const isAdmin = userRoles.includes('admin');
    
    console.log('🔍 Admin Panel Debug:');
    console.log('User:', user);
    console.log('User Roles:', userRoles);
    console.log('Is Admin:', isAdmin);
    
    if (!isAdmin) {
      navigate('/');
      return;
    }
  }, [isAuthenticated, user, navigate, getUserRoles]);

  // Fetch products
  useEffect(() => {
    if (isAuthenticated() && getUserRoles().includes('admin')) {
      console.log('Fetching products...');
      console.log('Auth token:', localStorage.getItem('token'));
      fetchProducts();
    } else {
      console.log('Not fetching products - Auth check failed:');
      console.log('Is authenticated:', isAuthenticated());
      console.log('User roles:', getUserRoles());
    }
  }, [isAuthenticated, getUserRoles]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      console.log('Making API request to fetch products...');
      const response = await fetch('http://localhost:6004/catalog-service/products', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      console.log('API Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch products: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Fetched products raw data:', data);
      
      // API returns { products: [...] }
      const productsArray = data.products || [];
      console.log('Processed products array:', productsArray);
      
      setProducts(productsArray);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      category: '',
      imageFile: ''
    });
    setEditingProduct(null);
    setShowAddForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const url = 'http://localhost:6004/catalog-service/products';
      const method = editingProduct ? 'PUT' : 'POST';
      
      // Convert category string to array and handle comma-separated values
      const categoryArray = formData.category.split(',').map(cat => cat.trim());
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...(editingProduct && { id: editingProduct.id }), // Include ID only for updates
          name: formData.name,
          description: formData.description,
          price: parseFloat(formData.price),
          category: categoryArray,
          imageFile: formData.imageFile,
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save product');
      }

      resetForm();
      fetchProducts();
    } catch (err) {
      console.error('Error saving product:', err);
      setError(err.message);
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      category: Array.isArray(product.category) ? product.category.join(', ') : product.category,
      imageFile: product.imageFile || ''
    });
    setShowAddForm(true);
  };

  const handleDelete = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:6004/catalog-service/products/${productId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete product');
      }

      fetchProducts();
    } catch (err) {
      setError(err.message);
    }
  };

  // Check authentication and admin role
  if (!isAuthenticated() || !getUserRoles().includes('admin')) {
    return (
      <div className="admin-panel">
        <div className="admin-header">
          <h1>Admin Panel</h1>
          <p>Access denied. Admin privileges required.</p>
          <div style={{ marginTop: '20px', padding: '20px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px' }}>
            <h3>Debug Information:</h3>
            <p><strong>User:</strong> {JSON.stringify(user, null, 2)}</p>
            <p><strong>User Roles:</strong> {JSON.stringify(getUserRoles(), null, 2)}</p>
            <p><strong>Is Authenticated:</strong> {isAuthenticated() ? 'Yes' : 'No'}</p>
            <p><strong>Token:</strong> {localStorage.getItem('token') ? 'Present' : 'Missing'}</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="admin-loading">Loading products...</div>;
  }

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h1>Admin Panel</h1>
        <p>Welcome, {user?.username}!</p>
        <button 
          className="btn btn-primary"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? 'Cancel' : 'Add New Product'}
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {showAddForm && (
        <div className="product-form">
          <h2>{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Name:</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Description:</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Price:</label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                step="0.01"
                min="0"
                required
              />
            </div>
            
            <div className="form-group">
              <label>Category:</label>
              <input
                type="text"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Image File:</label>
              <input
                type="text"
                name="imageFile"
                value={formData.imageFile}
                onChange={handleInputChange}
                placeholder="Image file name, e.g., product.jpg"
              />
            </div>
            
            <div className="form-actions">
              <button type="submit" className="btn btn-success">
                {editingProduct ? 'Update Product' : 'Add Product'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={resetForm}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="products-list">
        <h2>Products ({products.length})</h2>
        <div className="products-grid">
          {products.map(product => (
            <div key={product.id} className="product-card">
              <div className="product-image">
                <img 
                  src={product.imageFile ? `/images/product/${product.imageFile}` : '/images/placeholder.png'} 
                  alt={product.name}
                  onError={(e) => {
                    e.target.src = '/images/placeholder.png';
                  }}
                />
              </div>
              <div className="product-info">
                <h3>{product.name}</h3>
                <p className="product-description">{product.description}</p>
                <p className="product-category">Category: {product.category}</p>
                <p className="product-price">${product.price}</p>
              </div>
              <div className="product-actions">
                <button 
                  className="btn btn-edit"
                  onClick={() => handleEdit(product)}
                >
                  Edit
                </button>
                <button 
                  className="btn btn-delete"
                  onClick={() => handleDelete(product.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
        
        {products.length === 0 && (
          <div className="no-products">
            <p>No products found. Add your first product!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel; 