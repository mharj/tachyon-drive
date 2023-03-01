export interface IPersistSerializer<Input, Output> {
	serialize: (data: Input) => Output;
	deserialize: (value: Output) => Input;
}
