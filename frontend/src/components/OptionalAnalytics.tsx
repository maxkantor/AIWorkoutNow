import { useEffect } from 'react';

function appendScript(src: string, attrs: Record<string, string> = {}) {
  const s = document.createElement('script');
  s.async = true;
  s.src = src;
  Object.entries(attrs).forEach(([k, v]) => s.setAttribute(k, v));
  document.head.appendChild(s);
  return s;
}

export default function OptionalAnalytics() {
  useEffect(() => {
    const ga4 = (import.meta as any).env?.VITE_GA4_ID as string | undefined;
    const gtm = (import.meta as any).env?.VITE_GTM_ID as string | undefined;
    const clarity = (import.meta as any).env?.VITE_CLARITY_ID as string | undefined;

    // Google Analytics 4
    if (ga4) {
      appendScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga4)}`);
      const inline = document.createElement('script');
      inline.text = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${ga4}', { anonymize_ip: true });
      `;
      document.head.appendChild(inline);
    }

    // Google Tag Manager
    if (gtm) {
      const inline = document.createElement('script');
      inline.text = `
        (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start': new Date().getTime(),event:'gtm.js'});
        var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
        j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
        })(window,document,'script','dataLayer','${gtm}');
      `;
      document.head.appendChild(inline);
    }

    // Microsoft Clarity
    if (clarity) {
      const inline = document.createElement('script');
      inline.text = `
        (function(c,l,a,r,i,t,y){
          c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
          t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
          y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
        })(window, document, "clarity", "script", "${clarity}");
      `;
      document.head.appendChild(inline);
    }
  }, []);

  return null;
}

