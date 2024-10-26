import { Test, TestingModule } from "@nestjs/testing";
import { AlphabetController } from "./alphabet.controller";
import { AlphabetService } from "./alphabet.service";

describe("AlphabetController", () => {
  let controller: AlphabetController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AlphabetController],
      providers: [AlphabetService],
    }).compile();

    controller = module.get<AlphabetController>(AlphabetController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
