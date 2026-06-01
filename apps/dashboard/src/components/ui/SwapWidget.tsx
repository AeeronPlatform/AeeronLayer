import { useEffect, useRef } from 'react';
  import { AERN_MINT, SOL_MINT, USDC_MINT } from '../../constants';

  interface SwapWidgetProps {
    defaultInputMint?: string;
    defaultOutputMint?: string;
  }

  declare global {
    interface Window { Jupiter: { init: (config: object) => void } }
  }

  export function SwapWidget({
    defaultInputMint  = SOL_MINT.toBase58(),
    defaultOutputMint = AERN_MINT.toBase58(),
  }: SwapWidgetProps) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const script = document.createElement('script');
      script.src = 'https://terminal.jup.ag/main-v2.js';
      script.async = true;
      script.onload = () => {
        if (!window.Jupiter || !ref.current) return;
        window.Jupiter.init({
          displayMode: 'integrated',
          integratedTargetId: 'jupiter-terminal',
          endpoint: 'https://mainnet.helius-rpc.com/?api-key=public',
          defaultExplorer: 'Solana Explorer',
          formProps: {
            initialInputMint:  defaultInputMint,
            initialOutputMint: defaultOutputMint,
            fixedOutputMint: true,
          },
          passthroughWalletContextState: null,
        });
      };
      document.body.appendChild(script);
      return () => { document.body.removeChild(script); };
    }, [defaultInputMint, defaultOutputMint]);

    return (
      <div className="rounded-xl border border-white/10 bg-[#0d0d14] overflow-hidden">
        <div id="jupiter-terminal" ref={ref} className="w-full min-h-[520px]" />
      </div>
    );
  }

  export { SOL_MINT, USDC_MINT, AERN_MINT };
  