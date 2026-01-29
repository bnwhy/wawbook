import React, { useEffect, useState } from 'react';

interface PaymentBadgesProps {
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

const PaymentBadges: React.FC<PaymentBadgesProps> = ({ size = 'medium', className = '' }) => {
  const [acceptedMethods, setAcceptedMethods] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPaymentMethods = async () => {
      try {
        const response = await fetch('/api/settings/payment');
        if (response.ok) {
          const data = await response.json();
          setAcceptedMethods(data.value?.acceptedPaymentMethods || []);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des méthodes de paiement:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentMethods();
  }, []);

  const sizeConfig = {
    small: { height: '40px', padding: '8px 12px' },
    medium: { height: '52px', padding: '10px 16px' },
    large: { height: '64px', padding: '12px 20px' }
  };

  const config = sizeConfig[size];
  const logoHeight = size === 'small' ? '24px' : size === 'medium' ? '32px' : '40px';

  // Logos officiels depuis le dépôt GitHub datatrans/payment-logos via jsDelivr CDN
  const paymentLogos: Record<string, { url: string; name: string }> = {
    visa: {
      url: 'https://cdn.jsdelivr.net/gh/datatrans/payment-logos@master/assets/cards/visa.svg',
      name: 'Visa'
    },
    mastercard: {
      url: 'https://cdn.jsdelivr.net/gh/datatrans/payment-logos@master/assets/cards/mastercard.svg',
      name: 'Mastercard'
    },
    amex: {
      url: 'https://cdn.jsdelivr.net/gh/datatrans/payment-logos@master/assets/cards/american-express.svg',
      name: 'American Express'
    },
    discover: {
      url: 'https://cdn.jsdelivr.net/gh/datatrans/payment-logos@master/assets/cards/discover.svg',
      name: 'Discover'
    },
    applepay: {
      url: 'https://cdn.jsdelivr.net/gh/datatrans/payment-logos@master/assets/wallets/apple-pay.svg',
      name: 'Apple Pay'
    },
    googlepay: {
      url: 'https://cdn.jsdelivr.net/gh/datatrans/payment-logos@master/assets/wallets/google-pay.svg',
      name: 'Google Pay'
    },
    paypal: {
      url: 'https://cdn.jsdelivr.net/gh/datatrans/payment-logos@master/assets/apm/paypal.svg',
      name: 'PayPal'
    },
    klarna: {
      url: 'https://cdn.jsdelivr.net/gh/datatrans/payment-logos@master/assets/apm/klarna.svg',
      name: 'Klarna'
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center gap-3 ${className}`}>
        <div className="animate-pulse flex gap-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div
              key={i}
              className="bg-gray-200 rounded"
              style={{ height: config.height, width: '60px' }}
            ></div>
          ))}
        </div>
      </div>
    );
  }

  if (acceptedMethods.length === 0) {
    return null;
  }

  return (
    <div className={`flex items-center justify-center flex-wrap gap-3 ${className}`}>
      {acceptedMethods.map(method => {
        const logo = paymentLogos[method];
        if (!logo) return null;
        
        return (
          <div
            key={method}
            className="inline-flex items-center justify-center rounded shadow-sm"
            style={{
              height: config.height,
              padding: config.padding,
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E7EB'
            }}
            title={logo.name}
          >
            <img
              src={logo.url}
              alt={logo.name}
              style={{
                height: logoHeight,
                width: 'auto',
                maxWidth: size === 'small' ? '55px' : size === 'medium' ? '75px' : '95px'
              }}
              className="object-contain"
            />
          </div>
        );
      })}
    </div>
  );
};

export default PaymentBadges;
