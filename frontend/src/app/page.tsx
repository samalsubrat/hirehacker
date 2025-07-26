import MaxWidthWrapper from "@/components/MaxWidthWrapper";
import { FlickeringGrid } from "@/components/flickering-grid";
export default function Home() {
  return (
    <>
    <section>
      <div className="absolute inset-0 opacity-40">
        <FlickeringGrid
          squareSize={3}
          gridGap={10}
          flickerChance={0.2}
          maxOpacity={0.2}
          className="w-full h-lvh"
        />
      </div>
    </section>
    </>
  );
}
