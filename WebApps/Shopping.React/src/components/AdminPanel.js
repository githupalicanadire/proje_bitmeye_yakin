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
  const [successMessage, setSuccessMessage] = useState(null);
  
  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingProductId, setEditingProductId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    imageFile: ''
  });

  // Inline editing states
  const [inlineEditing, setInlineEditing] = useState({});

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
      console.log('Auth token:', localStorage.getItem('access_token'));
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
      console.log('Making API request to fetch all products...');
      
      // Request all products by setting a very high pageSize
      const response = await fetch('http://localhost:6004/catalog-service/products?pageNumber=1&pageSize=1000', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
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
      console.log('Total products fetched:', productsArray.length);
      
      // Debug: Log first few products with their image URLs
      productsArray.slice(0, 3).forEach((product, index) => {
        console.log(`Product ${index + 1}:`, {
          id: product.id,
          name: product.name,
          imageFile: product.imageFile,
          price: product.price
        });
      });
      
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

  const handleInlineInputChange = (productId, field, value) => {
    setInlineEditing(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [field]: value
      }
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
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
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

      const result = await response.json();
      console.log('Product saved successfully:', result);

      setSuccessMessage(editingProduct ? 'Ürün başarıyla güncellendi!' : 'Yeni ürün başarıyla eklendi!');
      setTimeout(() => setSuccessMessage(null), 3000);

      resetForm();
      fetchProducts(); // Refresh the list to show new/updated products
    } catch (err) {
      console.error('Error saving product:', err);
      setError(err.message);
    }
  };

  const handleInlineEdit = (product) => {
    setEditingProductId(product.id);
    setInlineEditing({
      [product.id]: {
        name: product.name,
        description: product.description,
        price: product.price.toString(),
        category: Array.isArray(product.category) ? product.category.join(', ') : product.category,
        imageFile: product.imageFile || ''
      }
    });
  };

  const handleInlineSave = async (productId) => {
    try {
      const editingData = inlineEditing[productId];
      if (!editingData) return;

      const categoryArray = editingData.category.split(',').map(cat => cat.trim());
      
      const response = await fetch('http://localhost:6004/catalog-service/products', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          id: productId,
          name: editingData.name,
          description: editingData.description,
          price: parseFloat(editingData.price),
          category: categoryArray,
          imageFile: editingData.imageFile,
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update product');
      }

      setSuccessMessage('Ürün başarıyla güncellendi!');
      setTimeout(() => setSuccessMessage(null), 3000);

      setEditingProductId(null);
      setInlineEditing({});
      fetchProducts(); // Refresh the list
    } catch (err) {
      console.error('Error updating product:', err);
      setError(err.message);
    }
  };

  const handleInlineCancel = () => {
    setEditingProductId(null);
    setInlineEditing({});
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
    if (!window.confirm('Bu ürünü silmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:6004/catalog-service/products/${productId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete product');
      }

      setSuccessMessage('Ürün başarıyla silindi!');
      setTimeout(() => setSuccessMessage(null), 3000);

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
            <p><strong>Token:</strong> {localStorage.getItem('access_token') ? 'Present' : 'Missing'}</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="admin-loading">Ürünler yükleniyor...</div>;
  }

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h1>Admin Panel</h1>
        <p>Hoş geldiniz, {user?.username}!</p>
        <button 
          className="btn btn-primary"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? 'İptal' : 'Yeni Ürün Ekle'}
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {successMessage && (
        <div className="success-message">
          {successMessage}
          <button onClick={() => setSuccessMessage(null)}>×</button>
        </div>
      )}

      {showAddForm && (
        <div className="product-form">
          <h2>{editingProduct ? 'Ürün Düzenle' : 'Yeni Ürün Ekle'}</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Ürün Adı:</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Açıklama:</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Fiyat:</label>
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
              <label>Kategori:</label>
              <input
                type="text"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                placeholder="Kategori1, Kategori2, Kategori3"
                required
              />
            </div>
            
            <div className="form-group">
              <label>Resim Dosyası:</label>
              <input
                type="text"
                name="imageFile"
                value={formData.imageFile}
                onChange={handleInputChange}
                placeholder="Resim dosya adı, örn: product.jpg"
              />
            </div>
            
            <div className="form-actions">
              <button type="submit" className="btn btn-success">
                {editingProduct ? 'Ürünü Güncelle' : 'Ürün Ekle'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={resetForm}>
                İptal
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="products-list">
        <h2>Ürünler ({products.length})</h2>
        <div className="products-grid">
          {products.map(product => {
            const isEditing = editingProductId === product.id;
            const editingData = inlineEditing[product.id] || {};
            
            return (
              <div key={product.id} className={`product-card ${isEditing ? 'editing' : ''}`}>
                <div className="product-image">
                  <img 
                    src={product.imageFile || '/images/placeholder.png'} 
                    alt={product.name}
                    onError={(e) => {
                      e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><rect width="300" height="200" fill="%23f0f0f0"/><text x="150" y="100" text-anchor="middle" fill="%23999" font-family="Arial, sans-serif" font-size="14">Resim Yok</text></svg>';
                    }}
                  />
                </div>
                
                <div className="product-info">
                  {isEditing ? (
                    <div className="inline-edit-form">
                      <input
                        type="text"
                        value={editingData.name || ''}
                        onChange={(e) => handleInlineInputChange(product.id, 'name', e.target.value)}
                        className="inline-input"
                        placeholder="Ürün adı"
                      />
                      <textarea
                        value={editingData.description || ''}
                        onChange={(e) => handleInlineInputChange(product.id, 'description', e.target.value)}
                        className="inline-textarea"
                        placeholder="Açıklama"
                      />
                      <input
                        type="text"
                        value={editingData.category || ''}
                        onChange={(e) => handleInlineInputChange(product.id, 'category', e.target.value)}
                        className="inline-input"
                        placeholder="Kategori"
                      />
                      <input
                        type="number"
                        value={editingData.price || ''}
                        onChange={(e) => handleInlineInputChange(product.id, 'price', e.target.value)}
                        className="inline-input"
                        step="0.01"
                        min="0"
                        placeholder="Fiyat"
                      />
                      <input
                        type="text"
                        value={editingData.imageFile || ''}
                        onChange={(e) => handleInlineInputChange(product.id, 'imageFile', e.target.value)}
                        className="inline-input"
                        placeholder="Resim dosyası"
                      />
                    </div>
                  ) : (
                    <>
                      <h3>{product.name}</h3>
                      <p className="product-description">{product.description}</p>
                      <p className="product-category">Kategori: {Array.isArray(product.category) ? product.category.join(', ') : product.category}</p>
                      <p className="product-price">${product.price}</p>
                    </>
                  )}
                </div>
                
                <div className="product-actions">
                  {isEditing ? (
                    <>
                      <button 
                        className="btn btn-success"
                        onClick={() => handleInlineSave(product.id)}
                      >
                        Kaydet
                      </button>
                      <button 
                        className="btn btn-secondary"
                        onClick={handleInlineCancel}
                      >
                        İptal
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        className="btn btn-edit"
                        onClick={() => handleInlineEdit(product)}
                      >
                        Düzenle
                      </button>
                      <button 
                        className="btn btn-delete"
                        onClick={() => handleDelete(product.id)}
                      >
                        Sil
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        {products.length === 0 && (
          <div className="no-products">
            <p>Henüz ürün bulunmuyor. İlk ürününüzü ekleyin!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel; 