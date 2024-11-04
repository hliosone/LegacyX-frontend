import { useState, useEffect } from 'react';
import './App.css';
import { Xumm } from 'xumm';

const xumm = new Xumm(import.meta.env.VITE_XUMM_API_KEY); // API Key pour Xumm

function App() {
  const [account, setAccount] = useState('');
  const [activeTab, setActiveTab] = useState('create');
  const [testatorDID, setTestatorDID] = useState('');
  const [inheritorAddress, setInheritorAddress] = useState('');

  const fetchAccount = async () => {
    const a = await xumm.user.account;
    setAccount(a ?? '');
  };

  useEffect(() => {
    // Vérifie l'état de connexion lors du montage du composant
    fetchAccount();

    // Écoute les changements de connexion en temps réel
    const handleStatusChange = () => fetchAccount();
    xumm.on('success', handleStatusChange);
    xumm.on('retrieved', handleStatusChange);
    xumm.on('error', () => setAccount(''));

    return () => {
      xumm.off('success', handleStatusChange);
      xumm.off('retrieved', handleStatusChange);
      xumm.off('error', () => setAccount(''));
    };
  }, []);

  const logout = () => {
    xumm.logout();
    setAccount('');
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };
  

  const handleCreateContract = async () => {
    const contractData = {
      testatorDID: testatorDID,
      inheritorAddress: inheritorAddress,
    };
  
    try {
      const response = await fetch('http://localhost:8080/api/createContract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contractData),
      });
  
      if (response.ok) {
        console.log("Contrat envoyé avec succès");
      } else {
        console.log("Erreur lors de l'envoi du contrat");
      }
    } catch (error) {
      console.error("Erreur de requête :", error);
    }
  };
  

  return (

    // Add image logo on top of H1 title not too big <img src="/public\legacyx-logo-site.png" alt="LegacyX Logo"/>
    <div id="app">
      <div className="container">
        <div className="left-section">
          <h1>LegacyX</h1>
          <h2>XRPL Inheritance</h2>          
          <p>Secure Your Digital Legacy</p>
          {account === '' ? (
            <button onClick={() => xumm.authorize()} className="primary-button">
              Connect XUMM Wallet
            </button>
          ) : (
            <div>
              <p>Connected as: <b>{account}</b></p>
              <button onClick={logout} className="secondary-button">Déconnexion</button>
            </div>
          )}
        </div>
        <div className="right-section">
          {account !== '' ? (
            <>
              <div className="tab-container">
                <button className={`tab ${activeTab === 'create' ? 'active' : ''}`} onClick={() => handleTabChange('create')}>
                  Create
                </button>
                <button className={`tab ${activeTab === 'claim' ? 'active' : ''}`} onClick={() => handleTabChange('claim')}>
                  Claim
                </button>
                <button className={`tab ${activeTab === 'gov' ? 'active' : ''}`} onClick={() => handleTabChange('gov')}>
                  Gov
                </button>
              </div>
              <div className="tab-content">
                {activeTab === 'create' && (
                  <div>
                    <h2>Create Inheritance Contract</h2>
                    <p>Instructions pour créer un contrat d'héritage sécurisé.</p>
                    <label>
                      Testator DID:
                      <input
                        type="text"
                        value={testatorDID}
                        onChange={(e) => setTestatorDID(e.target.value)}
                      />
                    </label>
                    <label>
                      Inheritor Address:
                      <input
                        type="text"
                        value={inheritorAddress}
                        onChange={(e) => setInheritorAddress(e.target.value)}
                      />
                    </label>
                    <button onClick={handleCreateContract} className="primary-button">
                      Create Contract (10 XRP)
                    </button>
                  </div>
                )}
                {activeTab === 'claim' && (
                  <div>
                    <h2>Claim Inheritance</h2>
                    <p>Instructions pour réclamer votre héritage digital.</p>
                  </div>
                )}
                {activeTab === 'gov' && (
                  <div>
                    <h2>Government Verification</h2>
                    <p>Instructions pour la vérification gouvernementale.</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <p className="right-section-placeholder">Veuillez connecter votre wallet pour accéder aux fonctionnalités.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
