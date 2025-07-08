// App.jsx - SUBSTITUA TODO O CONTEÚDO POR ESTE:

function App() {
  return (
    <div style={{
      backgroundColor: '#8B4513', // Marrom agro
      color: 'white',
      padding: '2rem',
      minHeight: '100vh',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>
        🐂 Black Face OX Marketplace
      </h1>
      
      <p style={{ fontSize: '1.2rem', marginBottom: '2rem' }}>
        Moda Country & Agro do Sul do Brasil
      </p>

      <div style={{
        backgroundColor: '#228B22', // Verde agro
        padding: '1rem',
        borderRadius: '8px',
        marginBottom: '1rem'
      }}>
        <h2>✅ React funcionando!</h2>
        <p>Se você está vendo esta tela, o React está rodando perfeitamente!</p>
      </div>

      <div style={{
        backgroundColor: '#F5F3F0', // Creme agro
        color: '#2F1B14', // Texto escuro
        padding: '1rem',
        borderRadius: '8px',
        marginBottom: '1rem'
      }}>
        <h3>🎯 Próximos passos:</h3>
        <ul>
          <li>✅ React configurado</li>
          <li>✅ Servidor rodando</li>
          <li>⏳ Conectar com backend</li>
          <li>⏳ Criar componentes</li>
        </ul>
      </div>

      <button style={{
        backgroundColor: '#228B22',
        color: 'white',
        padding: '1rem 2rem',
        border: 'none',
        borderRadius: '8px',
        fontSize: '1rem',
        cursor: 'pointer'
      }} onClick={() => alert('Botão funcionando! 🎉')}>
        Testar Interação
      </button>
    </div>
  )
}

export default App