import { useQuery } from "urql";

const GAMES_QUERY = `
  query {
    okinoko_iarv2_waiting_for_join {
      id
      name
      creator
      betamount
      betasset
    }
  }
`;

export function LatestGames() {
  const [result] = useQuery({ query: GAMES_QUERY });
  const { data, fetching, error } = result;

  if (fetching) return <p>Loading games...</p>;
  if (error) return <p style="color:red;">Error: {error.message}</p>;

  if (!data?.okinoko_iarv2_waiting_for_join?.length) {
    return <p>No games waiting for join 🎮</p>;
  }

  return (
    <div>
      <h2>🕹️ Waiting Games</h2>
      <ul>
        {data.okinoko_iarv2_waiting_for_join.map(g => (
          <li key={g.id}>
            <strong>{g.name}</strong> — created by <em>{g.by}</em>  
            ({g.betamount} {g.betasset})
          </li>
        ))}
      </ul>
    </div>
  );
}
