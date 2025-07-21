function CheckoutFailure() {
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>❌ Pagamento Falhou</h1>
      <p>Houve um problema com seu pagamento.</p>
      <button onClick={() => window.location.href = '/'}>
        Tentar novamente
      </button>
    </div>
  );
}

export default CheckoutFailure; // ← IMPORTANTE: export default