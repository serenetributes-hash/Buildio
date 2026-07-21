export function Modal({ title, onClose, children, width = 440 }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(16,35,59,0.45)',
        display: 'grid', placeItems: 'center', zIndex: 100,
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{ width, maxHeight: '85vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>{title}</h3>
          <button className="btn ghost" style={{ padding: '4px 10px' }} onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
