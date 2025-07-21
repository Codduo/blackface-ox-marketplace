function CheckoutPending() {
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>⏳ Pagamento Pendente</h1>
      <p>Seu pagamento está sendo processado.</p>
      <button onClick={() => window.location.href = '/'}>
        Voltar ao início
      </button>
    </div>
  );
}

export default CheckoutPending; // ← IMPORTANTE: export default