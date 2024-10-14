import { connectionSource } from "src/common/config/database.config";
import { GenderEnum, RoleEnum } from "src/common/enums/enum";
import { hashed } from "src/lib/bcrypt";
import { User } from "src/modules/user/entities/user.entity";
import { createConnection, DataSource } from "typeorm"



(async () => {
    const connection: DataSource = await createConnection(connectionSource);

    const queryRunner = connection.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {

        // **** Creating director **** //

        const userRepository = queryRunner.manager.getRepository(User);
        const users = await userRepository.find();
        await userRepository.remove(users);
        const newUser = new User();
        newUser.firstName = "Ilyosbek",
        newUser.lastName = "Isaqov",
        newUser.phoneNumber = "+998335701001",
        newUser.role = RoleEnum.DIRECTOR,
        newUser.gender = GenderEnum.MALE,
        newUser.password = await hashed("password");
        await userRepository.save<User>(newUser);
        await queryRunner.commitTransaction();
    } catch (err) {
        console.log("error", err);
        await queryRunner.rollbackTransaction();
    } finally {
        await queryRunner.release();
    }
})();
