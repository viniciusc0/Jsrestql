import { setupCounter } from "./counter.ts";
import Jsrestql from "./jsrestql.ts";
import "./style.css";

function runQuery() {
  const service = new Jsrestql(
    `get teste where api_key = @api_key HAVING count >= 1; 
    from teste as teste2 in teste.data where api_key = @api_key;
   `,
    {
      api_key: "a0b123f5660d46fecff10e7bca185790",
    }
  );
  service.run().then((response) => {
    console.log({ response });
  });
}

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
<main style={{ display: 'flex', gap: '20px', padding: '20px' }}>
<div>
    
    <div>
        <button id="consultar">Consultar</button>
    </div>
</div>
</main>
`;
document.querySelector<HTMLDivElement>("#consultar")!.onclick = () =>
  runQuery();

setupCounter(document.querySelector<HTMLButtonElement>("#counter")!);
