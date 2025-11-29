'use client';

import Link from 'next/link';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer style={{
      borderTop: '1px solid rgba(255, 255, 255, 0.1)',
      background: 'rgba(16, 29, 34, 0.8)',
      backdropFilter: 'blur(10px)',
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '3rem 1.5rem',
      }}>
        {/* Main Footer Content */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '2rem',
          marginBottom: '2rem',
        }}>
          {/* Brand Section */}
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginBottom: '1rem',
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                color: '#36c3f2',
              }}>
                <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                  <path clipRule="evenodd" d="M24 0.757355L47.2426 24L24 47.2426L0.757355 24L24 0.757355ZM21 35.7574V12.2426L9.24264 24L21 35.7574Z" fill="currentColor" fillRule="evenodd"/>
                </svg>
              </div>
              <h3 style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: 'white',
                margin: 0,
              }}>Noto</h3>
            </div>
            <p style={{
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: '0.875rem',
              lineHeight: '1.6',
              margin: 0,
            }}>
              Next-generation music recognition powered by advanced audio fingerprinting technology.
            </p>
          </div>

          {/* Product Links */}
          <div>
            <h4 style={{
              fontSize: '0.875rem',
              fontWeight: '600',
              color: 'white',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '1rem',
            }}>Product</h4>
            <ul style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}>
              <li>
                <Link href="/" style={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  transition: 'color 0.2s',
                }}>Home</Link>
              </li>
              <li>
                <Link href="/test" style={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  transition: 'color 0.2s',
                }}>Try Recognition</Link>
              </li>
            </ul>
          </div>

          {/* Resources Links */}
          <div>
            <h4 style={{
              fontSize: '0.875rem',
              fontWeight: '600',
              color: 'white',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '1rem',
            }}>Resources</h4>
            <ul style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}>
              <li>
                <a href="https://github.com/MangeshBhalerao/Noto" target="_blank" rel="noopener noreferrer" style={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  transition: 'color 0.2s',
                }}>GitHub</a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div style={{
          paddingTop: '2rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <p style={{
            color: 'rgba(255, 255, 255, 0.5)',
            fontSize: '0.875rem',
            margin: 0,
          }}>
            © {currentYear} Noto. Built with passion for music.
          </p>
          <div style={{
            display: 'flex',
            gap: '2rem',
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}>
          </div>
        </div>
      </div>

      <style jsx>{`
        a:hover {
          color: rgba(255, 255, 255, 1) !important;
        }
        
        @media (min-width: 768px) {
          footer > div > div:last-child {
            flex-direction: row;
          }
        }
      `}</style>
    </footer>
  );
}
