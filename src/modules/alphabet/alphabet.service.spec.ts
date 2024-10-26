import { Test, TestingModule } from "@nestjs/testing";
import { AlphabetService } from "./alphabet.service";

describe("AlphabetService", () => {
  let service: AlphabetService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AlphabetService],
    }).compile();

    service = module.get<AlphabetService>(AlphabetService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
