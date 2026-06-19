.PHONY: proto install test lint

proto:
	bash scripts/gen_proto.sh

install:
	pip install -r requirements.txt

test:
	PYTHONPATH=src pytest tests/ -v

lint:
	ruff check src/ tests/
	mypy src/
