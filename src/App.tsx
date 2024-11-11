import { useState, useEffect } from 'react';
import './App.css';
import { Xumm } from 'xumm';

const xumm = new Xumm(import.meta.env.VITE_XUMM_API_KEY);

function App() {
  const [account, setAccount] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('create');
  const [inheritorAddress, setInheritorAddress] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [vcToVerify, setVcToVerify] = useState<string>('');
  const [deceasedDidToVerify, setDeceasedDidToVerify] = useState<string>('');
  const [verificationResult, setVerificationResult] = useState<string>('');
  const [serviceFeeQrCodeUrl, setServiceFeeQrCodeUrl] = useState<string | null>(null);
  const [multisigActivationQrCodeUrl, setMultisigActivationQrCodeUrl] = useState<string | null>(null);
  const [govTestatorDID, setGovTestatorDID] = useState<string>('');
  const [multisigAddress, setMultisigAddress] = useState<string>('');
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [inheritorQrCodeUrl, setInheritorQrCodeUrl] = useState<string | null>(null);

  const fetchAccount = async () => {
    const a = await xumm.user.account;
    setAccount(a ?? '');
  };

  useEffect(() => {
    fetchAccount();
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
    setError(null);
    setSuccessMessage('');
  };

  const handleGenerateMultisigAddress = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/customer/generateMultisigAddress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const data = await response.json();
        setMultisigAddress(data.multisigAddress);
        setError(null);
        setSuccessMessage("Adresse multisig générée. Veuillez scanner le QR code pour envoyer 20 XRP et activer le compte.");

        const payload = await xumm.payload?.create({
          txjson: {
            TransactionType: 'Payment',
            Destination: data.multisigAddress,
            Amount: '20000000' // 20 XRP en drops
          }
        });
        
        if (payload && payload.refs && payload.refs.qr_png) {
          setMultisigActivationQrCodeUrl(payload.refs.qr_png);
        } else {
          setError("Erreur lors de la création du QR code de paiement.");
        }
      } else {
        setError("Erreur lors de la génération de l'adresse multisig.");
      }
    } catch (error) {
      setError("Erreur de requête lors de la génération de l'adresse multisig.");
    }
  };

  const handleGenerateServiceFeeQrCode = async () => {
    try {
      if (!import.meta.env.VITE_PLATFORM_ADDRESS) {
        console.error("VITE_PLATFORM_ADDRESS n'est pas défini dans les variables d'environnement.");
        setError("Adresse de destination non définie.");
        return;
      }

      const payload = await xumm.payload?.create({
        txjson: {
          TransactionType: 'Payment',
          Destination: import.meta.env.VITE_PLATFORM_ADDRESS,
          Amount: '5000000' // 5 XRP en drops
        }
      });

      if (payload && payload.refs && payload.refs.qr_png) {
        setServiceFeeQrCodeUrl(payload.refs.qr_png);
        setError(null);
      } else {
        console.error("Payload data:", payload);
        setError("Erreur lors de la création du QR code pour les frais de service.");
      }
    } catch (error) {
      console.error("Erreur lors de la création du QR code:", error);
      setError("Erreur de requête lors de la création du QR code pour les frais de service.");
    }
  };

  const handleVerifyServiceFee = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/customer/verifyServiceFee`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          testatorAddress: account,
        }),
      });

      if (response.ok) {
        const feeReceived = await response.json();
        if (feeReceived) {
          setSuccessMessage("Frais de service reçu avec succès !");
        } else {
          setError("Le paiement des frais de service de 5 XRP n'a pas été trouvé. Veuillez vérifier.");
        }
      } else {
        const errorText = await response.text();
        setError(errorText);
        setSuccessMessage('');
      }
    } catch (error) {
      setError("Erreur de requête lors de la vérification des frais de service.");
    }
  };

  const handleActivateInheritanceContract = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/customer/activateInheritanceContract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          testatorAddress: account,
          inheritorAddress: inheritorAddress,
          multisigAddress: multisigAddress,
        }),
      });

      if (response.ok) {
        const message = await response.text();
        setSuccessMessage(`Succès ! ${message}`);
        setError(null);
      } else {
        const errorText = await response.text();
        setError(errorText);
        setSuccessMessage('');
      }
    } catch (error) {
      setError("Erreur de requête lors de l'activation du contrat d'héritage.");
    }
  };

  const handleCreateDidAndSignTransaction = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/government/prepareDeathCertificateTransaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deceasedDid: govTestatorDID, inheritor: account }),
      });
  
      if (response.ok) {
        const { txjson } = await response.json();
        const payload = await xumm.payload?.create({ txjson });
  
        if (payload && xumm.payload) {
          setQrCodeUrl(payload.refs.qr_png);
          setError(null);
          const subscription = (await xumm.payload.subscribe(payload.uuid, async (event) => {
            if (event.data.signed === true) {
              (subscription as any).cancel(); // Force le typage pour accéder à 'cancel'
              const result = await xumm.payload?.get(payload.uuid);
              if (result && result.meta.resolved === true && result.meta.signed === true) {
                setSuccessMessage('Transaction soumise avec succès pour le DID');
                setQrCodeUrl(null);
              } else {
                setError("Erreur lors de la soumission de la transaction.");
              }
            } else if (event.data.signed === false) {
              setError("La transaction a été rejetée.");
              setQrCodeUrl(null);
              (subscription as any).cancel();
            }
          })) as any; // Utilisation de 'as any' pour résoudre les erreurs de typage
        } else {
          setError("Erreur lors de la création du payload. Le payload est null.");
        }
      } else {
        const errorText = await response.text();
        setError("Erreur lors de la préparation de la transaction");
      }
    } catch (error) {
      setError("Erreur de requête lors de la préparation de la transaction");
    }
  };
  
  

  const handleVerifyDeathCertificate = async () => {
    try {
      const url = `${import.meta.env.VITE_BACKEND_URL}/api/government/verifyDeathCertificate?vc=${encodeURIComponent(vcToVerify)}&testatorDid=${encodeURIComponent(deceasedDidToVerify)}&inheritorAddress=${encodeURIComponent(account)}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.message) {
          setVerificationResult("Certificat valide.");
          setError(null);
        } else {
          setVerificationResult("Certificat invalide.");
          setError(null);
        }
      } else {
        setError("Invalid certificate or DID");
      }
    } catch (error) {
      setError("Error while verifying the death certificate.");
    }
  };

  const handleGenerateInheritorQrCode = async (txJson: any) => {
    try {
      const payload = await xumm.payload?.create({ txjson: txJson });
      if (payload && payload.refs && payload.refs.qr_png) {
        setInheritorQrCodeUrl(payload.refs.qr_png);
        setError(null);
      } else {
        setError("Erreur lors de la création du QR code pour la signature de l'héritier.");
      }
    } catch (error) {
      setError("Erreur lors de la génération du QR code pour l'héritier.");
    }
  };

  return (
    <div id="app">
      <div className="container">
        <div className="left-section">
          <img src="/legacyx-logo-site.png" alt="LegacyX Logo" className="logo" />
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
              <button onClick={logout} className="secondary-button">Disconnect</button>
            </div>
          )}
        </div>
        <div className="right-section">
          {account !== '' ? (
            <>
              <div className="tab-container">
                <button className={`tab ${activeTab === 'create' ? 'active' : ''}`} onClick={() => handleTabChange('create')}>
                  Create Contract
                </button>
                <button className={`tab ${activeTab === 'claim' ? 'active' : ''}`} onClick={() => handleTabChange('claim')}>
                  Claim Inheritance
                </button>
                <button className={`tab ${activeTab === 'gov' ? 'active' : ''}`} onClick={() => handleTabChange('gov')}>
                  Government certificates
                </button>
              </div>
              <div className="tab-content">
                {activeTab === 'create' && (
                  <div>
                    <h2>Create Inheritance Contract</h2>
                    <p>Instructions pour créer un contrat d'héritage sécurisé.</p>
                    <label>
                      Inheritor Address:
                      <input
                        type="text"
                        value={inheritorAddress}
                        onChange={(e) => setInheritorAddress(e.target.value)}
                      />
                    </label>
                    <button onClick={handleGenerateServiceFeeQrCode} className="primary-button">
                      Pay service fees (5 XRP)
                    </button>
                    {serviceFeeQrCodeUrl && (
                      <div className="qr-code-container">
                        <p>Scan this Xumm QR Code to pay service fees :</p>
                        <img src={serviceFeeQrCodeUrl} alt="QR Code for service fee payment" />
                      </div>
                    )}
                    <button onClick={handleVerifyServiceFee} className="primary-button">
                      Verify service fees payment
                    </button>
                    {!multisigAddress ? (
                      <button onClick={handleGenerateMultisigAddress} className="primary-button">
                        Generate inheritance address
                      </button>
                    ) : (
                      <div>
                        <p>Multisig address : <b>{multisigAddress}</b></p>
                        {multisigActivationQrCodeUrl && (
                          <div className="qr-code-container">
                            <p>Scan this Xumm QR Code to send 20 XRP to your inheritance account and activate it :</p>
                            <img src={multisigActivationQrCodeUrl} alt="QR Code for multisig activation" />
                          </div>
                        )}
                        <button onClick={handleActivateInheritanceContract} className="primary-button">
                          Validate inheritance contract activation
                        </button>
                      </div>
                    )}
                    {successMessage && (
                      <div className="success-message">
                        {successMessage}
                      </div>
                    )}
                    {error && (
                      <div className="error-message">
                        {error}
                      </div>
                    )}
                  </div>
                )}
                {activeTab === 'claim' && (
                  <div>
                    <h2>Claim Inheritance</h2>
                    <p>Claim your digital inheritance.</p>
                    <label>
                      Verifiable Credential (VC):
                      <textarea
                        value={vcToVerify}
                        onChange={(e) => setVcToVerify(e.target.value)}
                        rows={5}
                        style={{ width: '100%' }}
                      />
                    </label>
                    <label>
                      Deceased DID:
                      <input
                        type="text"
                        value={deceasedDidToVerify}
                        onChange={(e) => setDeceasedDidToVerify(e.target.value)}
                      />
                    </label>
                    <button onClick={handleVerifyDeathCertificate} className="primary-button">
                      Verify Death Certificate
                    </button>
                    {verificationResult && (
                      <p style={{ color: verificationResult.includes("valide") ? 'green' : 'red' }}>
                        {verificationResult}
                      </p>
                    )}
                    {inheritorQrCodeUrl && (
                      <div className="qr-code-container">
                        <p>Scan this QR Code to sign as the inheritor :</p>
                        <img src={inheritorQrCodeUrl} alt="QR Code for inheritor signature" />
                      </div>
                    )}
                    {error && <div className="error-message">{error}</div>}
                  </div>
                )}
                {activeTab === 'gov' && (
                  <div>
                    <h2>Government Verification</h2>
                    <p>Get an official death certificate signed by the government:</p>
                    <label>
                      Testator DID:
                      <input
                        type="text"
                        value={govTestatorDID}
                        onChange={(e) => setGovTestatorDID(e.target.value)}
                      />
                    </label>
                    <button onClick={handleCreateDidAndSignTransaction} className="primary-button">
                      Get certificate
                    </button>
                    {qrCodeUrl && (
                      <div className="qr-code-container">
                        <p>Scan this Xumm QR Code to get your certificate :</p>
                        <img src={qrCodeUrl} alt="QR Code for transaction" />
                      </div>
                    )}
                    {successMessage && (
                      <div className="success-message">
                        {successMessage}
                      </div>
                    )}
                    {error && (
                      <div className="error-message">
                        {error}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <p className="right-section-placeholder">Connect with your wallet to access digital inheritance services.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
