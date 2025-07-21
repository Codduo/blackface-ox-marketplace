function CheckoutSuccess() {
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>✅ Pagamento Aprovado!</h1>
      <p>Seu pedido foi processado com sucesso.</p>
      <button onClick={() => window.location.href = '/'}>
        Voltar ao início
      </button>
    </div>
  );
}

export default CheckoutSuccess; // ← IMPORTANTE: export default