import { Composition, Still } from "remotion";
import { SynapticDemo } from "./compositions/SynapticDemo";
import { Thumbnail } from "./compositions/Thumbnail";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="SynapticDemo"
        component={SynapticDemo}
        durationInFrames={2950}
        fps={30}
        width={1920}
        height={1080}
      />
      <Still
        id="Thumbnail"
        component={Thumbnail}
        width={1920}
        height={1080}
      />
    </>
  );
};
