import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type Todo = { id: number; text: string; completed: boolean; userId: string };

export function useTodoCreate(onSuccess?: () => void) {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.todo.create.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: queryKeys.todo() });
				onSuccess?.();
			},
		}),
	);
}

export function useTodoToggle() {
	const queryClient = useQueryClient();

	return useMutation({
		...orpc.todo.toggle.mutationOptions(),
		onMutate: async (variables) => {
			await queryClient.cancelQueries({ queryKey: queryKeys.todoList() });
			const previous = queryClient.getQueryData<Todo[]>(queryKeys.todoList());
			queryClient.setQueryData(queryKeys.todoList(), (old: Todo[] | undefined) =>
				old?.map((t) =>
					t.id === variables.id ? { ...t, completed: variables.completed } : t,
				),
			);
			return { previous };
		},
		onError: (_err, _variables, context) => {
			if (context?.previous) {
				queryClient.setQueryData(queryKeys.todoList(), context.previous);
			}
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.todo() });
		},
	});
}

export function useTodoDelete() {
	const queryClient = useQueryClient();

	return useMutation({
		...orpc.todo.delete.mutationOptions(),
		onMutate: async (variables) => {
			await queryClient.cancelQueries({ queryKey: queryKeys.todoList() });
			const previous = queryClient.getQueryData<Todo[]>(queryKeys.todoList());
			queryClient.setQueryData(queryKeys.todoList(), (old: Todo[] | undefined) =>
				old?.filter((t) => t.id !== variables.id),
			);
			return { previous };
		},
		onError: (_err, _variables, context) => {
			if (context?.previous) {
				queryClient.setQueryData(queryKeys.todoList(), context.previous);
			}
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.todo() });
		},
	});
}
