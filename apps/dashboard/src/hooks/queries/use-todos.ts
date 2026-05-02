import { orpc } from "@/shared/api/orpc";
import { useQuery } from "@tanstack/react-query";

export function useTodos() {
	return useQuery(orpc.todo.getAll.queryOptions({ input: {} }));
}
