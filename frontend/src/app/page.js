'use client';

import Link from "next/link";
import Footer from "./components/Footer";

export default function Home() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'linear-gradient(135deg, #0a1214 0%, #101d22 50%, #0f1a1e 100%)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Animated Background Elements */}
      <div style={{
        position: 'absolute',
        top: '10%',
        left: '5%',
        width: '300px',
        height: '300px',
        background: 'radial-gradient(circle, rgba(54, 195, 242, 0.1) 0%, transparent 70%)',
        borderRadius: '50%',
        filter: 'blur(60px)',
        animation: 'float 8s ease-in-out infinite',
      }}></div>
      
      <div style={{
        position: 'absolute',
        bottom: '15%',
        right: '10%',
        width: '400px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(54, 195, 242, 0.08) 0%, transparent 70%)',
        borderRadius: '50%',
        filter: 'blur(80px)',
        animation: 'float 10s ease-in-out infinite reverse',
      }}></div>

      {/* Main Content */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.5rem',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Logo/Icon */}
        <div style={{
          marginBottom: '2rem',
          animation: 'fadeInUp 0.8s ease-out',
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            color: '#36c3f2',
            filter: 'drop-shadow(0 0 20px rgba(54, 195, 242, 0.3))',
          }}>
            <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path clipRule="evenodd" d="M24 0.757355L47.2426 24L24 47.2426L0.757355 24L24 0.757355ZM21 35.7574V12.2426L9.24264 24L21 35.7574Z" fill="currentColor" fillRule="evenodd"/>
            </svg>
          </div>
        </div>

        {/* Hero Text */}
        <div style={{
          textAlign: 'center',
          maxWidth: '800px',
          marginBottom: '3rem',
        }}>
          <h1 style={{
            fontSize: 'clamp(3rem, 8vw, 5.5rem)',
            fontWeight: '700',
            background: 'linear-gradient(135deg, #ffffff 0%, rgba(255, 255, 255, 0.8) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: '1.5rem',
            lineHeight: '1.1',
            animation: 'fadeInUp 0.8s ease-out 0.2s both',
          }}>
            Noto
          </h1>
          
          <p style={{
            fontSize: 'clamp(1.125rem, 3vw, 1.5rem)',
            color: 'rgba(255, 255, 255, 0.7)',
            lineHeight: '1.6',
            maxWidth: '600px',
            margin: '0 auto 1rem',
            animation: 'fadeInUp 0.8s ease-out 0.4s both',
          }}>
            AI-powered music recognition
          </p>
          
          <p style={{
            fontSize: 'clamp(0.875rem, 2vw, 1rem)',
            color: 'rgba(255, 255, 255, 0.5)',
            lineHeight: '1.6',
            maxWidth: '500px',
            margin: '0 auto',
            animation: 'fadeInUp 0.8s ease-out 0.6s both',
          }}>
            Identify any song in seconds using advanced audio fingerprinting technology
          </p>
        </div>

        {/* CTA Button */}
        <Link
          href="/test"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '1rem 2.5rem',
            backgroundColor: '#36c3f2',
            color: '#0a1214',
            fontSize: '1.125rem',
            fontWeight: '600',
            borderRadius: '9999px',
            textDecoration: 'none',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 0 30px rgba(54, 195, 242, 0.3)',
            animation: 'fadeInUp 0.8s ease-out 0.8s both',
            position: 'relative',
            overflow: 'hidden',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = '0 0 40px rgba(54, 195, 242, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 0 30px rgba(54, 195, 242, 0.3)';
          }}
        >
          <span>Start Recognizing</span>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Link>

        {/* Feature Pills */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          marginTop: '3rem',
          flexWrap: 'wrap',
          justifyContent: 'center',
          animation: 'fadeInUp 0.8s ease-out 1s both',
        }}>
          {['Real-time Recognition', 'High Accuracy', 'Privacy First'].map((feature, index) => (
            <div key={index} style={{
              padding: '0.5rem 1.25rem',
              background: 'rgba(54, 195, 242, 0.1)',
              border: '1px solid rgba(54, 195, 242, 0.2)',
              borderRadius: '9999px',
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '0.875rem',
              fontWeight: '500',
              backdropFilter: 'blur(10px)',
            }}>
              {feature}
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <Footer />

      {/* Animations */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          50% { transform: translateY(-20px) translateX(10px); }
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
