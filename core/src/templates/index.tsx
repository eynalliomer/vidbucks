// Registry of the templates: one demo composition each. Copy a demo config (demos.ts), change the content, add a line here.
import React from "react";
import { Composition } from "remotion";
import { IconStory } from "./IconStory";
import { ObjectStory } from "./ObjectStory";
import { KineticType, kineticDuration } from "./KineticType";
import { ParticleBloom } from "./ParticleBloom";
import { dollarLira } from "./dollarLira";
import { HoloPromo } from "./HoloPromo";
import { dolarPromo } from "./dolarPromo";
import { AiAgents, AI_AGENTS_SEC } from "./AiAgents";
import { LaptopGlass, LAPTOP_SEC } from "./LaptopGlass";
import { JericoLaptop } from "./JericoLaptop";
import { JericoCinematic, CINE_SEC } from "./JericoCinematic";
import { iconStoryDemo, kineticDemo, objectStoryDemo, particleDemo } from "./demos";

export const TemplateCompositions: React.FC = () => (
  <>
    <Composition id="Tpl-IconStory" component={IconStory as React.FC<any>} defaultProps={{ cfg: iconStoryDemo }} width={iconStoryDemo.width} height={iconStoryDemo.height} fps={iconStoryDemo.fps} durationInFrames={Math.round(iconStoryDemo.durationSec * iconStoryDemo.fps)} />
    <Composition id="Tpl-ObjectStory" component={ObjectStory as React.FC<any>} defaultProps={{ cfg: objectStoryDemo }} width={objectStoryDemo.width} height={objectStoryDemo.height} fps={objectStoryDemo.fps} durationInFrames={Math.round(objectStoryDemo.durationSec * objectStoryDemo.fps)} />
    <Composition id="Tpl-KineticType-Vertical" component={KineticType as React.FC<any>} defaultProps={{ cfg: kineticDemo }} width={kineticDemo.width} height={kineticDemo.height} fps={kineticDemo.fps} durationInFrames={kineticDuration(kineticDemo)} />
    <Composition id="Tpl-KineticType-Horizontal" component={KineticType as React.FC<any>} defaultProps={{ cfg: { ...kineticDemo, width: 1920, height: 1080 } }} width={1920} height={1080} fps={kineticDemo.fps} durationInFrames={kineticDuration(kineticDemo)} />
    <Composition id="Tpl-ParticleBloom" component={ParticleBloom as React.FC<any>} defaultProps={{ cfg: particleDemo }} width={particleDemo.width} height={particleDemo.height} fps={particleDemo.fps} durationInFrames={Math.round(particleDemo.durationSec * particleDemo.fps)} />
    <Composition id="DollarLira" component={ObjectStory as React.FC<any>} defaultProps={{ cfg: dollarLira }} width={dollarLira.width} height={dollarLira.height} fps={dollarLira.fps} durationInFrames={Math.round(dollarLira.durationSec * dollarLira.fps)} />
    <Composition id="DolarPromo" component={HoloPromo as React.FC<any>} defaultProps={{ cfg: dolarPromo }} width={dolarPromo.width} height={dolarPromo.height} fps={dolarPromo.fps} durationInFrames={Math.round(dolarPromo.durationSec * dolarPromo.fps)} />
    <Composition id="AiAgents" component={AiAgents} width={1920} height={1080} fps={30} durationInFrames={AI_AGENTS_SEC * 30} />
    <Composition id="LaptopGlass" component={LaptopGlass} width={1920} height={1080} fps={30} durationInFrames={LAPTOP_SEC * 30} />
    <Composition id="JericoLaptop" component={JericoLaptop} width={1920} height={1080} fps={30} durationInFrames={LAPTOP_SEC * 30} />
    <Composition id="JericoCinematic" component={JericoCinematic} width={3840} height={2160} fps={30} durationInFrames={Math.round(CINE_SEC * 30)} />
  </>
);
