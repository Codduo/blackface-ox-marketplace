function Home() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>🏠 Página Inicial - Black Face OX</h1>
      <p>Bem-vindo ao nosso marketplace!</p>
      <div style={{ marginTop: '20px' }}>
        <a 
          href="/checkout/success" 
          style={{ 
            color: 'blue', 
            textDecoration: 'underline',
            marginRight: '20px'
          }}
        >
          Testar página de sucesso
        </a>
        <a 
          href="/checkout/failure" 
          style={{ 
            color: 'red', 
            textDecoration: 'underline',
            marginRight: '20px'
          }}
        >
          Testar página de falha
        </a>
        <a 
          href="/checkout/pending" 
          style={{ 
            color: 'orange', 
            textDecoration: 'underline'
          }}
        >
          Testar página pendente
        </a>
      </div>
    </div>
  );
}

export default Home; // ← IMPORTANTE: export default