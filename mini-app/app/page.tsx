import { generateMetadata } from "@/lib/farcaster-embed";
import CyberAirHockey from "@/components/CyberAirHockey";

export { generateMetadata };

export default function Home() {
  // NEVER write anything here, only use this page to import components
  return (
    <div className="flex justify-center items-center w-full h-full">
      <div className="w-full md:w-1/2 h-[850px]">
        <CyberAirHockey />
      </div>
    </div>
  );
}
