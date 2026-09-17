import { useApp } from '../context/AppContext.jsx';
import { money, discountPercent, stockState } from '../lib/format.js';
import { ProductImage } from './Common.jsx';

export default function ProductCard({ product, compact = false }) {
  const { openProduct, addToCart, cart } = useApp();
  const inCart = cart.find((item) => item.id === product.id)?.quantity || 0;
  const discount = discountPercent(product);
  const stock = stockState(product);
  const soldOut = product.stock <= 0;

  const quickAdd = (event) => {
    event.stopPropagation();
    addToCart(product, 1);
  };

  return (
    <article className={`pcard ${compact ? 'pcard-compact' : ''} ${soldOut ? 'soldout' : ''}`} onClick={() => openProduct(product)}>
      <div className="pcard-media">
        <ProductImage product={product} />
        {discount > 0 && <span className="badge badge-red pcard-discount">−{discount}%</span>}
        {stock.tone !== 'green' && <span className={`badge badge-${stock.tone} pcard-stock`}>{stock.short}</span>}
      </div>

      <div className="pcard-body">
        <h4 className="pcard-name">{product.name}</h4>
        <div className="pcard-bottom">
          <div className="pcard-prices">
            {product.oldPrice ? <s className="price-old">{money(product.oldPrice)}</s> : <span className="price-unit">1 {product.unit}</span>}
            <b className={`price ${product.oldPrice ? 'price-sale' : ''}`}>{money(product.price)}</b>
          </div>
          <button className={`add-btn ${inCart ? 'in-cart' : ''}`} onClick={quickAdd} disabled={soldOut} aria-label="Savatchaga qo'shish">
            {inCart ? inCart : '➕'}
          </button>
        </div>
      </div>
    </article>
  );
}
