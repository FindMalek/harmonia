"use client";

import {
	Button,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	Checkbox,
	Input,
	Icons,
	Spinner,
} from "@harmonia/ui";
import {
	useTodoCreate,
	useTodoDelete,
	useTodoToggle,
} from "@/hooks/mutations/use-todo-mutations";
import { useTodos } from "@/hooks/queries/use-todos";
import { useState } from "react";

export default function TodosPage() {
	const [newTodoText, setNewTodoText] = useState("");

	const todos = useTodos();
	const createMutation = useTodoCreate(() => setNewTodoText(""));
	const toggleMutation = useTodoToggle();
	const deleteMutation = useTodoDelete();

	const handleAddTodo = (e: React.FormEvent) => {
		e.preventDefault();
		if (newTodoText.trim()) {
			createMutation.mutate({ text: newTodoText });
		}
	};

	const handleToggleTodo = (id: number, completed: boolean) => {
		toggleMutation.mutate({ id, completed: !completed });
	};

	const handleDeleteTodo = (id: number) => {
		deleteMutation.mutate({ id });
	};

	return (
		<div className="mx-auto w-full max-w-md py-10">
			<Card>
				<CardHeader>
					<CardTitle>Todo List</CardTitle>
					<CardDescription>Manage your tasks efficiently</CardDescription>
				</CardHeader>
				<CardContent>
					<form
						onSubmit={handleAddTodo}
						className="mb-6 flex items-center space-x-2"
					>
						<Input
							value={newTodoText}
							onChange={(e) => setNewTodoText(e.target.value)}
							placeholder="Add a new task..."
							disabled={createMutation.isPending}
						/>
						<Button
							type="submit"
							disabled={createMutation.isPending || !newTodoText.trim()}
						>
							{createMutation.isPending ? (
								<Spinner className="h-4 w-4 animate-spin" />
							) : (
								"Add"
							)}
						</Button>
					</form>

					{todos.isLoading ? (
						<div className="flex justify-center py-4">
							<Spinner className="h-6 w-6 animate-spin" />
						</div>
					) : todos.data?.length === 0 ? (
						<p className="py-4 text-center">No todos yet. Add one above!</p>
					) : (
						<ul className="space-y-2">
							{todos.data?.map((todo) => (
								<li
									key={todo.id}
									className="flex items-center justify-between rounded-md border p-2"
								>
									<div className="flex items-center space-x-2">
										<Checkbox
											checked={todo.completed}
											onCheckedChange={() =>
												handleToggleTodo(todo.id, todo.completed)
											}
											id={`todo-${todo.id}`}
										/>
										<label
											htmlFor={`todo-${todo.id}`}
											className={`${todo.completed ? "text-muted-foreground line-through" : ""}`}
										>
											{todo.text}
										</label>
									</div>
									<Button
										variant="ghost"
										size="icon"
										onClick={() => handleDeleteTodo(todo.id)}
										aria-label="Delete todo"
									>
										<Icons.trash className="h-4 w-4" />
									</Button>
								</li>
							))}
						</ul>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
