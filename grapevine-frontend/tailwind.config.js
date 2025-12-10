/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Semantic color tokens for design system
      colors: {
        // Base tokens
        border: 'var(--border)',
        background: 'var(--bw)',
        foreground: 'var(--text)',

        // Primary brand color (purple)
        main: {
          DEFAULT: 'var(--main)',
          foreground: 'var(--bw)',
        },

        // Accent colors (centralized)
        accent: {
          aqua: 'var(--accent-aqua)',
          orange: 'var(--accent-orange)',
        },

        // Pinata brand colors (preserved)
        pinata: {
          brandPartyPurple: "#6D57FF",
          brandGrassGreen: "#00CC92",
          brandPartyPink: "#EC78ff",
          brandSunOrange: "#FF9900",
          brandSkyBlue: "#57C2FF",
          brandSunshineYellow: "#FFE635",
          brandBlack: "#171420",
          brandCloud: "#EDF2F7",
          brandWhite: "#FFFFFF",
          brandHalfPartyPurple: "#A79AFF",
          brandHalfGrassGreen: "#4DE5A6",
          brandHalfPartyPink: "#F4AEFF",
          brandHalfSunOrange: "#F9C455",
          brandHalfSkyBlue: "#9ADBFF",
          brandHalfSunshineYellow: "#FFF293",
          tileBackgroundData: "#EDF3F7",
          tileBackgroundInformation: "#57C2FF",
          tileBackgroundTips: "#00CC92",
          tileBackgroundFeatures: "#5F61F2",
          backgroundTopNav: "#201D29",
          backgroundHighlight: "#F5F7FF",
          backgroundDark: "#CECCF8",
          backgroundDarkHeader: "#E0E1EA",
          backgroundOffWhite: "#F6F6F6",
          linesLines: "#EBEEFE",
          linesFields: "#B5BCC4",
          linesHighlight: "#5F61F2",
          fontsTitles: "#12101A",
          fontsFields: "#B5BCC4",
          fontsDisabled: "#B5BCC4",
          fontsCopy: "#171420",
          fontsSubtitles: "#6C737F",
          fontsOffwhite: "#F6F6F6",
          iconsIcons: "#6C737F",
          iconsHighlight: "#5F61F2",
          iconsBackground: "#EDF3F7",
          iconsOutline: "#B5BCC4",
          iconsOffwhite: "#F6F6F6",
          accentsGeneric: "#5F61F2",
          accentsBadges: "#FF9900",
          accentsBandwidth: "#57C2FF",
          accentsRequests: "#EC78FF",
          errorStateMain: "#DE5242",
          errorStateBackground: "#FFCFC9",
          informationStateMain: "#359ED9",
          informationStateBackground: "#C3E9FF",
          successStateMain: "#37BE75",
          successStateBackground: "#CBFBD6",
          buttonPrimary: "#5F61F2",
          buttonDocumentation: "#00CC92",
          buttonDestroy: "#DE5242",
          buttonSecondary: "#CECCF8",
          buttonPrimaryHover: "#4338CA",
          buttonSecondaryHover: "#5F61F2",
          buttonDocumentationHover: "#049B70",
          buttonDestroyHover: "#BF1C09",
          buttonDisabled: "#B5BCC4"
        },
      },

      // Typography scale
      fontSize: {
        'display': ['40px', { lineHeight: '48px', letterSpacing: '0.3px', fontWeight: '600' }],
        'h1': ['32px', { lineHeight: '40px', letterSpacing: '0.3px', fontWeight: '600' }],
        'h2': ['24px', { lineHeight: '28px', letterSpacing: '0.3px', fontWeight: '600' }],
        'h3': ['20px', { lineHeight: '24px', letterSpacing: '0.2px', fontWeight: '600' }],
        'title': ['18px', { lineHeight: '22px', letterSpacing: '0.2px', fontWeight: '600' }],
        'body': ['16px', { lineHeight: '22px', fontWeight: '400' }],
        'body-sm': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'caption': ['12px', { lineHeight: '16px', fontWeight: '400' }],
        'button': ['14px', { lineHeight: '20px', letterSpacing: '0.5px', fontWeight: '700' }],
      },

      // Border radius
      borderRadius: {
        'none': 'var(--radius-none)',
        'sm': 'var(--radius-sm)',
        'base': 'var(--radius-base)',
        'md': 'var(--radius-md)',
        'lg': 'var(--radius-lg)',
      },

      // Box shadows
      boxShadow: {
        // Raised button (default)
        'win95-raised': 'var(--shadow-raised)',
        'win95-raised-lg': 'var(--shadow-raised-lg)',

        // Pressed button (inset)
        'win95-inset': 'var(--shadow-inset)',

        // Card shadow
        'win95-card': 'var(--shadow-card)',
        'win95-card-lg': 'var(--shadow-card-lg)',

        // Modal shadow
        'win95-modal': 'var(--shadow-modal)',

        // No shadow
        'none': 'none',
      },

      // Font families
      fontFamily: {
        sans: ['var(--font-body)'],
        serif: ['var(--font-heading)'],
      },

      // Font weights
      fontWeight: {
        base: 'var(--base-font-weight)',
        heading: 'var(--heading-font-weight)',
      },

      // Animation durations
      transitionDuration: {
        'fast': '120ms',
        'base': '150ms',
        'slow': '180ms',
      },
    },
  },
  plugins: [],
}
