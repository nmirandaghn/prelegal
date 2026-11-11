import { NdaCreator } from "@/components/NdaCreator";
import { getMutualNdaTerms } from "@/lib/templates";

export default async function Home() {
  const terms = await getMutualNdaTerms();
  return <NdaCreator terms={terms} />;
}
