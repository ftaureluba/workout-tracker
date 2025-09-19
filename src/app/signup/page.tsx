
import SignupForm from "./signup-form";

export default function SignupPage() {
  return (
    <main className="flex items-center justify-center min-h-screen relative overflow-hidden bg-black">
            <div className="absolute inset-0 z-0 pointer-events-none">
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 1100 800"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              preserveAspectRatio="xMidYMid slice"
              
            >
              <defs>
                <radialGradient id="neonPulse1" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="rgba(255,255,255,1)" />
                  <stop offset="30%" stopColor="rgba(251,146,60,1)" />
                  <stop offset="70%" stopColor="rgba(249,115,22,0.8)" />
                  <stop offset="100%" stopColor="rgba(249,115,22,0)" />
                </radialGradient>
                <radialGradient id="neonPulse2" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.9)" />
                  <stop offset="25%" stopColor="rgba(251,146,60,0.9)" />
                  <stop offset="60%" stopColor="rgba(234,88,12,0.7)" />
                  <stop offset="100%" stopColor="rgba(234,88,12,0)" />
                </radialGradient>
                <radialGradient id="neonPulse3" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="rgba(255,255,255,1)" />
                  <stop offset="35%" stopColor="rgba(251,146,60,1)" />
                  <stop offset="75%" stopColor="rgba(234,88,12,0.6)" />
                  <stop offset="100%" stopColor="rgba(234,88,12,0)" />
                </radialGradient>
                <radialGradient id="heroTextBg" cx="30%" cy="50%" r="70%">
                  <stop offset="0%" stopColor="rgba(249,115,22,0.15)" />
                  <stop offset="40%" stopColor="rgba(251,146,60,0.08)" />
                  <stop offset="80%" stopColor="rgba(234,88,12,0.05)" />
                  <stop offset="100%" stopColor="rgba(0,0,0,0)" />
                </radialGradient>
                <filter id="heroTextBlur" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="12" result="blur" />
                  <feTurbulence baseFrequency="0.7" numOctaves="4" result="noise" />
                  <feColorMatrix in="noise" type="saturate" values="0" result="monoNoise" />
                  <feComponentTransfer in="monoNoise" result="alphaAdjustedNoise">
                    <feFuncA type="discrete" tableValues="0.03 0.06 0.09 0.12" />
                  </feComponentTransfer>
                  <feComposite in="blur" in2="alphaAdjustedNoise" operator="multiply" result="noisyBlur" />
                  <feMerge>
                    <feMergeNode in="noisyBlur" />
                  </feMerge>
                </filter>
                <linearGradient id="backgroundFade1" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgba(0,0,0,0)" />
                  <stop offset="20%" stopColor="rgba(249,115,22,0.15)" />
                  <stop offset="80%" stopColor="rgba(249,115,22,0.15)" />
                  <stop offset="100%" stopColor="rgba(0,0,0,0)" />
                </linearGradient>
                <linearGradient id="backgroundFade2" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgba(0,0,0,0)" />
                  <stop offset="15%" stopColor="rgba(251,146,60,0.12)" />
                  <stop offset="85%" stopColor="rgba(251,146,60,0.12)" />
                  <stop offset="100%" stopColor="rgba(0,0,0,0)" />
                </linearGradient>
                <linearGradient id="backgroundFade3" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgba(0,0,0,0)" />
                  <stop offset="25%" stopColor="rgba(234,88,12,0.18)" />
                  <stop offset="75%" stopColor="rgba(234,88,12,0.18)" />
                  <stop offset="100%" stopColor="rgba(0,0,0,0)" />
                </linearGradient>
                <linearGradient id="threadFade1" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgba(0,0,0,1)" />
                  <stop offset="15%" stopColor="rgba(249,115,22,0.8)" />
                  <stop offset="85%" stopColor="rgba(249,115,22,0.8)" />
                  <stop offset="100%" stopColor="rgba(0,0,0,1)" />
                </linearGradient>
                <linearGradient id="threadFade2" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgba(0,0,0,1)" />
                  <stop offset="12%" stopColor="rgba(251,146,60,0.7)" />
                  <stop offset="88%" stopColor="rgba(251,146,60,0.7)" />
                  <stop offset="100%" stopColor="rgba(0,0,0,1)" />
                </linearGradient>
                <linearGradient id="threadFade3" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgba(0,0,0,1)" />
                  <stop offset="18%" stopColor="rgba(234,88,12,0.8)" />
                  <stop offset="82%" stopColor="rgba(234,88,12,0.8)" />
                  <stop offset="100%" stopColor="rgba(0,0,0,1)" />
                </linearGradient>
                <filter id="backgroundBlur" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="8" result="blur" />
                  <feTurbulence baseFrequency="0.9" numOctaves="3" result="noise" />
                  <feColorMatrix in="noise" type="saturate" values="0" result="monoNoise" />
                  <feComponentTransfer in="monoNoise" result="alphaAdjustedNoise">
                    <feFuncA type="discrete" tableValues="0.05 0.1 0.15 0.2" />
                  </feComponentTransfer>
                  <feComposite in="blur" in2="alphaAdjustedNoise" operator="multiply" result="noisyBlur" />
                  <feMerge>
                    <feMergeNode in="noisyBlur" />
                  </feMerge>
                </filter>
                <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
    
              <g>
                <ellipse
                  cx="300"
                  cy="350"
                  rx="400"
                  ry="200"
                  fill="url(#heroTextBg)"
                  filter="url(#heroTextBlur)"
                  opacity="0.6"
                />
                <ellipse
                  cx="350"
                  cy="320"
                  rx="500"
                  ry="250"
                  fill="url(#heroTextBg)"
                  filter="url(#heroTextBlur)"
                  opacity="0.4"
                />
                <ellipse
                  cx="400"
                  cy="300"
                  rx="600"
                  ry="300"
                  fill="url(#heroTextBg)"
                  filter="url(#heroTextBlur)"
                  opacity="0.2"
                />
              </g>
              </svg>
              </div>
              
          <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <SignupForm />
            <p className="text-center text-sm text-gray-500">
          Ya tienes una cuenta?{' '}
          <a href="/login" className="font-semibold text-blue-500">
            Iniciar sesión
          </a>
        </p>
          </div>
        </div>
        </main>
  );
}
