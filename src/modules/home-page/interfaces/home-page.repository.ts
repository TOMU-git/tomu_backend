import { ID } from "src/common/types/type";
import { HomePage } from "../entities/home-page.entity";

export interface IHomePageRepository {
  create(dto: HomePage): Promise<HomePage>;
  findAll(): Promise<Array<HomePage>>;
  update(entity: HomePage): Promise<HomePage>;
  delete(entity: HomePage): Promise<HomePage>;
  findById(id: ID): Promise<HomePage | null>;
  findOneByName(title: string): Promise<HomePage | null>;
}
