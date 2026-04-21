"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/lib/firebase/context";
import { db, storage } from "@/lib/firebaseClient";
import { collection, query, where, getDocs, doc, setDoc, serverTimestamp, deleteDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useEffect, useState } from "react";
import Image from "next/image";

export default function VendorProducts() {
  const { user } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [hsnCode, setHsnCode] = useState("");
  const [gstRate, setGstRate] = useState("18"); // Default 18%
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const fetchProducts = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const q = query(collection(db, "products"), where("vendorUid", "==", user.uid));
      const snap = await getDocs(q);
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchProducts();
  }, [user]);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !imageFile) return alert("Image is required.");
    setUploading(true);
    
    const productId = `PRD-${Date.now()}`;
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.random().toString(36).substr(2, 4);
    
    try {
      // 1. Upload Image
      const storageRef = ref(storage, `vendors/${user.uid}/products/${productId}-${imageFile.name}`);
      await uploadBytes(storageRef, imageFile);
      const imageUrl = await getDownloadURL(storageRef);

      // 2. Create Document
      await setDoc(doc(db, "products", productId), {
        productId,
        vendorUid: user.uid,
        title,
        slug,
        price: parseFloat(price),
        hsnCode,
        gstRate: parseFloat(gstRate),
        images: [imageUrl],
        status: "active",
        createdAt: serverTimestamp(),
      });

      alert("Product added successfully!");
      setIsAdding(false);
      setTitle(""); setPrice(""); setHsnCode(""); setImageFile(null);
      fetchProducts();
    } catch (err) {
      console.error(err);
      alert("Error adding product.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (productId: string) => {
    if (!confirm("Delete product?")) return;
    try {
      await deleteDoc(doc(db, "products", productId));
      setProducts(prev => prev.filter(p => p.productId !== productId));
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <ProtectedRoute allowedRoles={["vendor"]}>
      <div className="container" style={{ marginTop: "4rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1>My Products</h1>
          <button onClick={() => setIsAdding(!isAdding)} style={{ padding: "0.5rem 1rem", background: "black", color: "white" }}>
            {isAdding ? "Cancel" : "+ Add Product"}
          </button>
        </div>

        {isAdding && (
          <form onSubmit={handleAddProduct} style={{ background: "#f9f9f9", padding: "2rem", marginTop: "2rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <h2>Create New Product</h2>
            <input type="text" placeholder="Product Title" required value={title} onChange={e => setTitle(e.target.value)} style={{ padding: "0.5rem" }} />
            <input type="number" placeholder="Price (INR)" required value={price} onChange={e => setPrice(e.target.value)} style={{ padding: "0.5rem" }} />
            <input type="text" placeholder="HSN Code" required value={hsnCode} onChange={e => setHsnCode(e.target.value)} style={{ padding: "0.5rem" }} />
            
            <label>GST Rate (%)</label>
            <select value={gstRate} onChange={e => setGstRate(e.target.value)} style={{ padding: "0.5rem" }}>
              <option value="0">0%</option>
              <option value="5">5%</option>
              <option value="12">12%</option>
              <option value="18">18%</option>
              <option value="28">28%</option>
            </select>

            <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] || null)} required />
            
            <button type="submit" disabled={uploading} style={{ background: "green", color: "white", padding: "1rem" }}>
              {uploading ? "Uploading..." : "Publish Product"}
            </button>
          </form>
        )}

        {loading ? <p>Loading...</p> : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "2rem", marginTop: "2rem" }}>
            {products.length === 0 && <p>No products yet.</p>}
            {products.map(p => (
              <div key={p.productId} style={{ border: "1px solid #eee", padding: "1rem" }}>
                <img src={p.images[0]} alt={p.title} width={200} height={200} style={{ objectFit: "cover", width: "100%", height: "200px" }} />
                <h3 style={{ margin: "1rem 0 0.5rem" }}>{p.title}</h3>
                <p>₹{p.price} <span style={{ fontSize: "0.8rem", color: "gray" }}>(+{p.gstRate}% GST)</span></p>
                <div style={{ marginTop: "1rem" }}>
                  <button onClick={() => handleDelete(p.productId)} style={{ color: "red", background: "none", border: "none", cursor: "pointer" }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
