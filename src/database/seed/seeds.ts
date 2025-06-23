// import { connectionSource } from "src/common/config/database.config";
// import { GenderEnum, HomeworkEnum, RoleEnum } from "src/common/enums/enum";
// import { hashed } from "src/lib/bcrypt";
// import { Block } from "src/modules/block/entities/block.entity";
// import { Course } from "src/modules/course/entities/course.entity";
// import { Feedback } from "src/modules/feedback/entities/feedback.entity";
// import { Grammar } from "src/modules/grammar/entities/grammar.entity";
// import { Lesson } from "src/modules/lesson/entities/lesson.entity";
// import { Tariff } from "src/modules/tariff/entities/tariff.entity";
// import { User } from "src/modules/user/entities/user.entity";
// import { createConnection, DataSource } from "typeorm";

// (async () => {
//   const connection: DataSource = await createConnection(connectionSource);

//   const queryRunner = connection.createQueryRunner();

//   await queryRunner.connect();
//   await queryRunner.startTransaction();
//   try {
//     // **** Creating director **** //

//     const userRepository = queryRunner.manager.getRepository(User);
//     const users = await userRepository.find();
//     await userRepository.remove(users);

//     const courseRepository = queryRunner.manager.getRepository(Course);
//     const courses = await courseRepository.find();
//     await courseRepository.remove(courses);

//     const blockRepository = queryRunner.manager.getRepository(Block);
//     const blocks = await blockRepository.find();
//     await blockRepository.remove(blocks);

//     const lessonRepository = queryRunner.manager.getRepository(Lesson);
//     const lessons = await lessonRepository.find();
//     await lessonRepository.remove(lessons);

//     const tariffRepository = queryRunner.manager.getRepository(Tariff);
//     const tariffs = await tariffRepository.find();
//     await tariffRepository.remove(tariffs);

//     const feedbackRepository = queryRunner.manager.getRepository(Feedback);
//     const feedbacks = await feedbackRepository.find();
//     await feedbackRepository.remove(feedbacks);

//     const grammarRepository = queryRunner.manager.getRepository(Grammar);
//     const grammars = await grammarRepository.find();
//     await grammarRepository.remove(grammars);

//     const newUser = new User();
//     (newUser.firstName = "Ilyosbek"),
//       (newUser.lastName = "Isaqov"),
//       (newUser.phoneNumber = "+998335701001"),
//       (newUser.role = RoleEnum.DIRECTOR),
//       (newUser.gender = GenderEnum.MALE),
//       (newUser.unhashedPassword = "password"),
//       (newUser.password = await hashed("password"));
//     await userRepository.save<User>(newUser);

//     const newUser1 = new User();
//     (newUser1.firstName = "John"),
//       (newUser1.lastName = "Doe"),
//       (newUser1.phoneNumber = "+998901234567"),
//       (newUser1.role = RoleEnum.ADMIN),
//       (newUser1.gender = GenderEnum.MALE),
//       (newUser1.unhashedPassword = "password"),
//       (newUser1.password = await hashed("password"));
//     await userRepository.save<User>(newUser1);

//     const newUser2 = new User();
//     (newUser2.firstName = "Ustoziation"),
//       (newUser2.lastName = "Mr"),
//       (newUser2.phoneNumber = "+998991234567"),
//       (newUser2.role = RoleEnum.TEACHER),
//       (newUser2.gender = GenderEnum.MALE),
//       (newUser2.unhashedPassword = "password"),
//       (newUser2.password = await hashed("password"));
//     await userRepository.save<User>(newUser2);

//     const firstNameList = [
//       "Ilyosbek",
//       "Anvar",
//       "Kamol",
//       "Aziz",
//       "Behruz",
//       "Javohir",
//       "Zafar",
//       "Ulugbek",
//       "Rustam",
//       "Sherzod",
//       "Farruh",
//       "Otabek",
//       "Jasur",
//       "Murod",
//       "Salim",
//       "Botir",
//       "Qobil",
//       "Shavkat",
//       "G‘ayrat",
//       "Sardor",
//       "Temur",
//       "Usmon",
//       "Abbos",
//       "Davron",
//       "Yahyo",
//       "Olim",
//       "Umar",
//       "Komil",
//       "Shahzod",
//       "Orif",
//       "Akmal",
//       "Diyor",
//       "Saidbek",
//       "Bunyod",
//       "Oybek",
//       "Alisher",
//       "Muhammad",
//       "Javohirbek",
//       "Zokir",
//       "Dilshod",
//       "Xurshid",
//       "Shohruh",
//       "Bekzod",
//       "Xusniddin",
//       "Amir",
//       "Hasan",
//       "Husan",
//       "Toxir",
//       "Shoxrux",
//       "Rasul",
//       "Erkin",
//       "Uktam",
//       "Mirzohid",
//       "Elbek",
//       "Qahramon",
//       "Elyor",
//       "Ziyodulla",
//       "Usmonali",
//       "Bahodir",
//       "Otaboy",
//       "Yaxyobek",
//       "Azamat",
//       "Fayzullo",
//       "Nasrullo",
//       "Zoir",
//       "Shohid",
//       "Mardon",
//       "Nuriddin",
//       "Zarif",
//       "Baxrom",
//       "Toshmat",
//       "Mirjalol",
//       "Akobir",
//       "Mukhammad",
//       "Sunnat",
//       "Qudrat",
//       "Mavlon",
//       "Shaxzod",
//       "Raxmat",
//       "Madamin",
//       "Maqsud",
//       "Tohir",
//       "Shukur",
//       "Sayfiddin",
//       "Nasim",
//       "Odil",
//       "Asad",
//       "Ochil",
//       "Ibrohim",
//       "Muxammadali",
//       "G‘olib",
//       "Xolmat",
//       "Turgun",
//       "Muslim",
//       "Mukhiddin",
//       "Barot",
//       "Sarvar",
//       "Shodiyor",
//       "Mahmud",
//       "Islom",
//       "Asqar",
//       "Xayrulla",
//       "Jaxongir",
//       "Odiljon",
//       "Saloxiddin",
//       "Zoirbek",
//       "Muzaffar",
//       "Xurram",
//       "Shahriyor",
//       "Yusuf",
//       "Bekmurod",
//       "Suhayl",
//       "Hamza",
//       "O‘tkir",
//       "Adham",
//       "Ilhom",
//       "Qudratulla",
//       "Saydullo",
//       "Yunus",
//       "Yuliy",
//       "Rustambek",
//       "Xurshidbek",
//       "Jasurbek",
//       "Dilnazar",
//       "Sherali",
//       "Zahid",
//       "Maruf",
//       "Shavkatbek",
//       "Raxmon",
//       "Zayniddin",
//       "Toxirjon",
//       "To‘lqin",
//       "Shukrullo",
//       "Shodmon",
//       "Botirali",
//       "Shomurod",
//       "A’zam",
//       "Ma’ruf",
//       "Jalil",
//       "Qodir",
//       "O’ral",
//       "Mumtoz",
//       "Mirobod",
//       "Zoirboy",
//       "G’iyos",
//       "Shavkatxon",
//       "Muslihiddin",
//       "Mirkomil",
//       "Arslonbek",
//       "Murodbek",
//       "Raxim",
//       "Yormuhammad",
//       "Qosim",
//       "Turon",
//       "Maqsudbek",
//       "Abdurahmon",
//       "Ulfat",
//       "Sobir",
//       "Muhtor",
//       "Ergash",
//       "G‘afur",
//       "Fayoz",
//       "Uktamjon",
//       "Shukurillo",
//       "Asilbek",
//       "Normurod",
//       "Mahmudjon",
//       "Habib",
//       "Adolat",
//       "Munis",
//       "Qahhor",
//       "Davlat",
//       "Yuldosh",
//       "Dovud",
//       "E’zoz",
//       "Xislat",
//       "Holik",
//       "Axmad",
//       "Nemat",
//       "Zoirjon",
//       "Kamal",
//       "Jumanazar",
//       "Yusufjon",
//       "G‘ulom",
//       "Turonboy",
//       "Muxammadbek",
//       "Jumaniyoz",
//       "Yoqub",
//       "Sattor",
//       "Orifbek",
//       "O1ktam",
//       "Botirjon",
//       "Shahzodbek",
//       "Rahmon",
//       "Mukhiddinjon",
//       "Sayfulla",
//       "Nurullo",
//       "Rixsiboy",
//       "Mirabbos",
//       "Shuxrat",
//     ];

//     const lastNameList = [
//       "Isaqov",
//       "Tursunov",
//       "Rahimov",
//       "Yuldashev",
//       "Karimov",
//       "Nazarov",
//       "Abdullayev",
//       "Eshonqulov",
//       "Saidov",
//       "Boboyev",
//       "Sotvoldiyev",
//       "Siddiqov",
//       "Haydarov",
//       "Xudoyberdiyev",
//       "Mavlonov",
//       "Norboyev",
//       "Alimov",
//       "Khamidov",
//       "Muminov",
//       "Rustamov",
//       "Parpiyev",
//       "Sobirov",
//       "Yusufov",
//       "Mansurov",
//       "Yuldoshov",
//       "Aripov",
//       "G‘aniyev",
//       "Ikromov",
//       "Davlatov",
//       "Samatov",
//       "Shamsiyev",
//       "Xudoyorov",
//       "Shokirov",
//       "Maxmudov",
//       "Eshmatov",
//       "Jumayev",
//       "Suvonov",
//       "To‘laganov",
//       "Qobilov",
//       "Qo‘chqorov",
//       "Salayev",
//       "Qo‘ziyev",
//       "Ortiqov",
//       "O‘rolov",
//       "Qurbonov",
//       "Qosimov",
//       "Sodiqov",
//       "Xojiyev",
//       "Jumaniyozov",
//       "Mirodilov",
//       "Rashidov",
//       "Holbo‘tayev",
//       "Adilov",
//       "To‘xtasinov",
//       "Muxtorov",
//       "Rahmatov",
//       "Matkarimov",
//       "Ro‘ziboyev",
//       "Xalilov",
//       "Muxamedov",
//       "Po‘latov",
//       "Orifxanov",
//       "Ravshanov",
//       "Sho‘rayev",
//       "Anorboyev",
//       "Yo‘ldoshev",
//       "Soliev",
//       "Omonboyev",
//       "Islomov",
//       "Ismoilov",
//       "Madaminov",
//       "Shaxriyorov",
//       "O‘tkirboyev",
//       "Nusratov",
//       "Shodmonov",
//       "Xurramov",
//       "Fayzullayev",
//       "Sherov",
//       "Ergashov",
//       "Ergashev",
//       "Qodirov",
//       "Mahmudov",
//       "Qobiljonov",
//       "Ikromjonov",
//       "Zayniev",
//       "Jalolov",
//       "Muslimov",
//       "Xalilov",
//       "Zavqiyev",
//       "G‘afforov",
//       "Sunnatov",
//       "Abdurahimov",
//       "Toshpulatov",
//       "Xalmatov",
//       "Zokirov",
//       "Fozilov",
//       "Rahimjonov",
//       "Turonov",
//       "Mirjalolov",
//       "Hasanov",
//       "Aminov",
//       "Xosilov",
//       "Shamshiddinov",
//       "Ulug‘bekov",
//       "Sirojiddinov",
//       "Komilov",
//       "Olimov",
//       "Sotiboldiyev",
//       "Yo‘ldoshev",
//       "Azimov",
//       "Muslimxo‘jayev",
//       "Alisherov",
//       "To‘raboyev",
//       "Norqulov",
//       "Shahobiddinov",
//       "Qodirjonov",
//       "Yusupov",
//       "Mirsodiqov",
//       "Rustambekov",
//       "Ayyubov",
//       "Ilhomov",
//       "Sohibov",
//       "Jabborov",
//       "Adhamov",
//       "Ahadov",
//       "Ravshanbekov",
//       "Amirxonov",
//       "Usmonov",
//       "Sirojov",
//       "Shomurodov",
//       "Sodiqjonov",
//       "Bahromov",
//       "Rahmatillaev",
//       "Elbekov",
//       "To‘raev",
//       "Xolmatov",
//       "Davlatov",
//       "Sherzodov",
//       "O‘roqov",
//       "Abduraimov",
//       "Shukurov",
//       "Yunusov",
//       "Aqilov",
//       "Muhammadov",
//       "Norbo‘tayev",
//       "Ochilov",
//       "Jabborov",
//       "Rashidjonov",
//       "Ma’murov",
//       "Habibov",
//       "Sobirxo‘jayev",
//       "Jumamurodov",
//       "Bo‘riboyev",
//       "G‘anijonov",
//       "Mirzakarimov",
//       "Zaripov",
//     ];

//     for (let i = 1; i <= 200; i++) {
//       const newUser = new User();
//       newUser.firstName =
//         firstNameList[Math.floor(Math.random() * firstNameList.length)];
//       newUser.lastName =
//         lastNameList[Math.floor(Math.random() * lastNameList.length)];
//       newUser.phoneNumber = `+998${(100000000 + i).toString().padStart(9, "0")}`;
//       newUser.role = RoleEnum.STUDENT;
//       newUser.unhashedPassword = "password";
//       newUser.gender = i % 2 === 0 ? GenderEnum.MALE : GenderEnum.FEMALE;
//       newUser.password = await hashed("password");
//       await userRepository.save<User>(newUser);
//     }

//     const teacherCount = 10; // O'qituvchilar soni
//     const teacherUsers = []; // O'qituvchilarni saqlash uchun massiv

//     for (let i = 1; i <= teacherCount; i++) {
//       const newUser = new User();
//       newUser.firstName =
//         firstNameList[Math.floor(Math.random() * firstNameList.length)];
//       newUser.lastName =
//         lastNameList[Math.floor(Math.random() * lastNameList.length)];
//       newUser.phoneNumber = `+998${(100000000 + i).toString().padStart(9, "0")}`;
//       newUser.unhashedPassword = "password";
//       newUser.role = RoleEnum.TEACHER; // TEACHER roli
//       newUser.gender = i % 2 === 0 ? GenderEnum.MALE : GenderEnum.FEMALE; // Har ikkinchi o'qituvchi ayol
//       newUser.password = await hashed("password");

//       teacherUsers.push(newUser); // O'qituvchilar ro'yxatiga qo'shish
//     }

//     // O'qituvchilarni saqlash
//     await userRepository.save<User>(teacherUsers);

//     // course
//     const newCourse1 = new Course();
//     (newCourse1.title = "Ingliz tili"),
//       (newCourse1.description =
//         "Bu kursda siz ingliz tilini noldan o'rganasiz"),
//       (newCourse1.imageUrl =
//         "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSuw4SisfKz7VDl50u52ZTV5DN0dPlkF4FCDg&s"),
//       (newCourse1.videoUrl = "https://player.vimeo.com/videos/1029577409"),
//       (newCourse1.mimetype = "image/png"),
//       (newCourse1.size = 296345);
//     newCourse1.isActive = true;
//     await courseRepository.save<Course>(newCourse1);

//     const newCourse2 = new Course();
//     (newCourse2.title = "Arab tili"),
//       (newCourse2.description = "Bu kursda siz Arab tilini noldan o'rganasiz"),
//       (newCourse2.imageUrl =
//         "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRbrFmJFjnSqocKv6BweSGHkzxuQ1OSjx0TiA&s"),
//       (newCourse2.videoUrl = "https://player.vimeo.com/videos/1029577409"),
//       (newCourse2.mimetype = "image/png"),
//       (newCourse2.size = 346345);
//     newCourse2.isActive = true;
//     await courseRepository.save<Course>(newCourse2);

//     const newCourse3 = new Course();
//     (newCourse3.title = "Rus tili"),
//       (newCourse3.description = "Bu kursda siz Rus tilini noldan o'rganasiz"),
//       (newCourse3.imageUrl =
//         "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTszlTQupC4fixin_ZRwLE4w3HkdP1Yg5j_Nw&s"),
//       (newCourse3.videoUrl = "https://player.vimeo.com/videos/1029577409"),
//       (newCourse3.mimetype = "image/png"),
//       (newCourse3.size = 231110);
//     newCourse3.isActive = true;
//     await courseRepository.save<Course>(newCourse3);

//     // ----------

//     const newTariff = new Tariff();
//     (newTariff.name = "1 oylik tarif"),
//       (newTariff.duration = 30),
//       (newTariff.courseId = newCourse1.id),
//       (newTariff.price = 100.0),
//       (newTariff.options = [
//         "O'qituvchi bilan muloqot",
//         "Istalgan vaqtida video darslarga kirish huquqi.",
//         "Dars materiallari va qo'shimcha resurslarga kirish.",
//         "O'qituvchi bilan har haftada zoom meetinglar.",
//         "O'qituvchilardan onlayn yordam va maslahatlar.",
//       ]);

//     await tariffRepository.save<Tariff>(newTariff);

//     const newTariff1 = new Tariff();
//     (newTariff1.name = "2 oylik tarif"),
//       (newTariff1.duration = 60),
//       (newTariff1.courseId = newCourse1.id),
//       (newTariff1.price = 200.0),
//       (newTariff1.options = [
//         "O'qituvchi bilan to'g'ridan-to'g'ri muloqot",
//         "Istalgan vaqtida video darslarga kirish huquqi.",
//         "Dars materiallari va qo'shimcha resurslarga kirish.",
//         "O'qituvchi bilan har haftada zoom meetinglar.",
//         "O'quvchilarning savollariga tezkor javoblar",
//         "O'qituvchilardan onlayn yordam va maslahatlar.",
//       ]);

//     await tariffRepository.save<Tariff>(newTariff1);

//     const newTariff3 = new Tariff();
//     (newTariff3.name = "3 oylik tarif"),
//       (newTariff3.duration = 90),
//       (newTariff3.courseId = newCourse1.id),
//       (newTariff3.price = 300.0),
//       (newTariff3.options = [
//         "O'qituvchi bilan to'g'ridan-to'g'ri muloqot",
//         "Istalgan vaqtida video darslarga kirish huquqi.",
//         "Dars materiallari va qo'shimcha resurslarga kirish.",
//         "O'qituvchi bilan har haftada zoom meetinglar.",
//         "O'quvchilarning savollariga tezkor javoblar",
//         "O'qituvchi bilan doimiy aloqada bo'lish imkoniyati",
//       ]);

//     await tariffRepository.save<Tariff>(newTariff3);

//     const newTariff4 = new Tariff();
//     (newTariff4.name = "1 oylik tarif"),
//       (newTariff4.duration = 30),
//       (newTariff4.courseId = newCourse2.id),
//       (newTariff4.price = 100.0),
//       (newTariff4.options = [
//         "O'qituvchi bilan muloqot",
//         "Istalgan vaqtida video darslarga kirish huquqi.",
//         "Dars materiallari va qo'shimcha resurslarga kirish.",
//         "O'qituvchi bilan har haftada zoom meetinglar.",
//         "O'qituvchilardan onlayn yordam va maslahatlar.",
//         ,
//       ]);
//     await tariffRepository.save<Tariff>(newTariff4);

//     const newTariff5 = new Tariff();
//     (newTariff5.name = "2 oylik tarif"),
//       (newTariff5.duration = 60),
//       (newTariff5.courseId = newCourse2.id),
//       (newTariff5.price = 200.0),
//       (newTariff5.options = [
//         "O'qituvchi bilan to'g'ridan-to'g'ri muloqot",
//         "Istalgan vaqtida video darslarga kirish huquqi.",
//         "Dars materiallari va qo'shimcha resurslarga kirish.",
//         "O'qituvchi bilan har haftada zoom meetinglar.",
//         "O'quvchilarning savollariga tezkor javoblar",
//         "O'qituvchilardan onlayn yordam va maslahatlar.",
//       ]);

//     await tariffRepository.save<Tariff>(newTariff5);

//     const newTariff6 = new Tariff();
//     (newTariff6.name = "3 oylik tarif"),
//       (newTariff6.duration = 90),
//       (newTariff6.courseId = newCourse2.id),
//       (newTariff6.price = 300.0),
//       (newTariff6.options = [
//         "O'qituvchi bilan to'g'ridan-to'g'ri muloqot",
//         "Istalgan vaqtida video darslarga kirish huquqi.",
//         "Dars materiallari va qo'shimcha resurslarga kirish.",
//         "O'qituvchi bilan har haftada zoom meetinglar.",
//         "O'quvchilarning savollariga tezkor javoblar",
//         "O'qituvchi bilan doimiy aloqada bo'lish imkoniyati",
//       ]);

//     await tariffRepository.save<Tariff>(newTariff6);

//     const newTariff7 = new Tariff();
//     (newTariff7.name = "1 oylik tarif"),
//       (newTariff7.duration = 30),
//       (newTariff7.courseId = newCourse3.id),
//       (newTariff7.price = 100.0),
//       (newTariff7.options = [
//         "O'qituvchi bilan muloqot",
//         "Istalgan vaqtida video darslarga kirish huquqi.",
//         "Dars materiallari va qo'shimcha resurslarga kirish.",
//         "O'qituvchi bilan har haftada zoom meetinglar.",
//         "O'qituvchilardan onlayn yordam va maslahatlar.",
//       ]);

//     await tariffRepository.save<Tariff>(newTariff7);

//     const newTariff8 = new Tariff();
//     (newTariff8.name = "2 oylik tarif"),
//       (newTariff8.duration = 60),
//       (newTariff8.courseId = newCourse3.id),
//       (newTariff8.price = 200.0),
//       (newTariff8.options = [
//         "O'qituvchi bilan to'g'ridan-to'g'ri muloqot",
//         "Istalgan vaqtida video darslarga kirish huquqi.",
//         "Dars materiallari va qo'shimcha resurslarga kirish.",
//         "O'qituvchi bilan har haftada zoom meetinglar.",
//         "O'quvchilarning savollariga tezkor javoblar",
//         "O'qituvchilardan onlayn yordam va maslahatlar.",
//       ]);
//     await tariffRepository.save<Tariff>(newTariff8);

//     const newTariff9 = new Tariff();
//     (newTariff9.name = "3 oylik tarif"),
//       (newTariff9.duration = 90),
//       (newTariff9.courseId = newCourse3.id),
//       (newTariff9.price = 300.0),
//       (newTariff9.options = [
//         "O'qituvchi bilan to'g'ridan-to'g'ri muloqot",
//         "Istalgan vaqtida video darslarga kirish huquqi.",
//         "Dars materiallari va qo'shimcha resurslarga kirish.",
//         "O'qituvchi bilan har haftada zoom meetinglar.",
//         "O'quvchilarning savollariga tezkor javoblar",
//         "O'qituvchi bilan doimiy aloqada bo'lish imkoniyati",
//       ]);

//     await tariffRepository.save<Tariff>(newTariff9);

//     // ----------

//     const newBlock1 = new Block();
//     newBlock1.title = "Module 1";
//     newBlock1.category = HomeworkEnum.LESSON;
//     newBlock1.order = 1;
//     newBlock1.course = newCourse1;
//     await blockRepository.save<Block>(newBlock1);

//     const newBlock2 = new Block();
//     newBlock2.title = "Module 2";
//     newBlock2.category = HomeworkEnum.LESSON;
//     newBlock2.order = 2;
//     newBlock2.course = newCourse1;
//     await blockRepository.save<Block>(newBlock2);

//     const newBlock3 = new Block();
//     newBlock3.title = "Module 3";
//     newBlock3.category = HomeworkEnum.LESSON;
//     newBlock3.order = 3;
//     newBlock3.course = newCourse1;
//     await blockRepository.save<Block>(newBlock3);

//     const newBlock4 = new Block();
//     newBlock4.title = "Module 4";
//     newBlock4.category = HomeworkEnum.LESSON;
//     newBlock4.order = 4;
//     newBlock4.course = newCourse1;
//     await blockRepository.save<Block>(newBlock4);

//     const newBlock5 = new Block();
//     newBlock5.title = "Module 5";
//     newBlock5.category = HomeworkEnum.LESSON;
//     newBlock5.order = 5;
//     newBlock5.course = newCourse1;
//     await blockRepository.save<Block>(newBlock5);

//     const newBlock6 = new Block();
//     newBlock6.title = "Module 6";
//     newBlock6.category = HomeworkEnum.LESSON;
//     newBlock6.order = 6;
//     newBlock6.course = newCourse1;
//     await blockRepository.save<Block>(newBlock6);

//     const newBlock7 = new Block();
//     newBlock7.title = "Module 7";
//     newBlock7.category = HomeworkEnum.LESSON;
//     newBlock7.order = 7;
//     newBlock7.course = newCourse1;
//     await blockRepository.save<Block>(newBlock7);

//     const newBlock8 = new Block();
//     newBlock8.title = "Module 8";
//     newBlock8.category = HomeworkEnum.LESSON;
//     newBlock8.order = 8;
//     newBlock8.course = newCourse1;
//     await blockRepository.save<Block>(newBlock8);

//     const newBlock9 = new Block();
//     newBlock9.title = "Module 9";
//     newBlock9.category = HomeworkEnum.LESSON;
//     newBlock9.order = 9;
//     newBlock9.course = newCourse1;
//     await blockRepository.save<Block>(newBlock9);

//     // ------------------

//     // 2-kurs uchun modullar
//     const newBlock10 = new Block();
//     newBlock10.title = "Module 1";
//     newBlock10.category = HomeworkEnum.LESSON;
//     newBlock10.order = 1;
//     newBlock10.course = newCourse2;
//     await blockRepository.save<Block>(newBlock10);

//     const newBlock11 = new Block();
//     newBlock11.title = "Module 2";
//     newBlock11.category = HomeworkEnum.LESSON;
//     newBlock11.order = 2;
//     newBlock11.course = newCourse2;
//     await blockRepository.save<Block>(newBlock11);

//     const newBlock12 = new Block();
//     newBlock12.title = "Module 3";
//     newBlock12.category = HomeworkEnum.LESSON;
//     newBlock12.order = 3;
//     newBlock12.course = newCourse2;
//     await blockRepository.save<Block>(newBlock12);

//     const newBlock13 = new Block();
//     newBlock13.title = "Module 4";
//     newBlock13.category = HomeworkEnum.LESSON;
//     newBlock13.order = 4;
//     newBlock13.course = newCourse2;
//     await blockRepository.save<Block>(newBlock13);

//     const newBlock14 = new Block();
//     newBlock14.title = "Module 5";
//     newBlock14.category = HomeworkEnum.LESSON;
//     newBlock14.order = 5;
//     newBlock14.course = newCourse2;
//     await blockRepository.save<Block>(newBlock14);

//     const newBlock15 = new Block();
//     newBlock15.title = "Module 6";
//     newBlock15.category = HomeworkEnum.LESSON;
//     newBlock15.order = 6;
//     newBlock15.course = newCourse2;
//     await blockRepository.save<Block>(newBlock15);

//     const newBlock16 = new Block();
//     newBlock16.title = "Module 7";
//     newBlock16.category = HomeworkEnum.LESSON;
//     newBlock16.order = 7;
//     newBlock16.course = newCourse2;
//     await blockRepository.save<Block>(newBlock16);

//     const newBlock17 = new Block();
//     newBlock17.title = "Module 8";
//     newBlock17.category = HomeworkEnum.LESSON;
//     newBlock17.order = 8;
//     newBlock17.course = newCourse2;
//     await blockRepository.save<Block>(newBlock17);

//     const newBlock18 = new Block();
//     newBlock18.title = "Module 9";
//     newBlock18.category = HomeworkEnum.LESSON;
//     newBlock18.order = 9;
//     newBlock18.course = newCourse2;
//     await blockRepository.save<Block>(newBlock18);

//     // ------------------

//     // 3-kurs uchun modullar
//     const newBlock19 = new Block();
//     newBlock19.title = "Module 1";
//     newBlock19.category = HomeworkEnum.LESSON;
//     newBlock19.order = 1;
//     newBlock19.course = newCourse3;
//     await blockRepository.save<Block>(newBlock19);

//     const newBlock20 = new Block();
//     newBlock20.title = "Module 2";
//     newBlock20.category = HomeworkEnum.LESSON;
//     newBlock20.order = 2;
//     newBlock20.course = newCourse3;
//     await blockRepository.save<Block>(newBlock20);

//     const newBlock21 = new Block();
//     newBlock21.title = "Module 3";
//     newBlock21.category = HomeworkEnum.LESSON;
//     newBlock21.order = 3;
//     newBlock21.course = newCourse3;
//     await blockRepository.save<Block>(newBlock21);

//     const newBlock22 = new Block();
//     newBlock22.title = "Module 4";
//     newBlock22.category = HomeworkEnum.LESSON;
//     newBlock22.order = 4;
//     newBlock22.course = newCourse3;
//     await blockRepository.save<Block>(newBlock22);

//     const newBlock23 = new Block();
//     newBlock23.title = "Module 5";
//     newBlock23.category = HomeworkEnum.LESSON;
//     newBlock23.order = 5;
//     newBlock23.course = newCourse3;
//     await blockRepository.save<Block>(newBlock23);

//     const newBlock24 = new Block();
//     newBlock24.title = "Module 6";
//     newBlock24.category = HomeworkEnum.LESSON;
//     newBlock24.order = 6;
//     newBlock24.course = newCourse3;
//     await blockRepository.save<Block>(newBlock24);

//     const newBlock25 = new Block();
//     newBlock25.title = "Module 7";
//     newBlock25.category = HomeworkEnum.LESSON;
//     newBlock25.order = 7;
//     newBlock25.course = newCourse3;
//     await blockRepository.save<Block>(newBlock25);

//     const newBlock26 = new Block();
//     newBlock26.title = "Module 8";
//     newBlock26.category = HomeworkEnum.LESSON;
//     newBlock26.order = 8;
//     newBlock26.course = newCourse3;
//     await blockRepository.save<Block>(newBlock26);

//     const newBlock27 = new Block();
//     newBlock27.title = "Module 9";
//     newBlock27.category = HomeworkEnum.LESSON;
//     newBlock27.order = 9;
//     newBlock27.course = newCourse3;
//     await blockRepository.save<Block>(newBlock27);

//     //----------------------------------------
//     // 1-kurs uchun module
//     const newBlock28 = new Block();
//     newBlock28.title = "Module 1";
//     newBlock28.category = HomeworkEnum.HOMEWORK;
//     newBlock28.order = 1;
//     newBlock28.course = newCourse1;
//     await blockRepository.save<Block>(newBlock28);

//     const newBlock29 = new Block();
//     newBlock29.title = "Module 2";
//     newBlock29.category = HomeworkEnum.HOMEWORK;
//     newBlock29.order = 2;
//     newBlock29.course = newCourse1;
//     await blockRepository.save<Block>(newBlock29);

//     const newBlock30 = new Block();
//     newBlock30.title = "Module 3";
//     newBlock30.category = HomeworkEnum.HOMEWORK;
//     newBlock30.order = 3;
//     newBlock30.course = newCourse1;
//     await blockRepository.save<Block>(newBlock30);

//     const newBlock31 = new Block();
//     newBlock31.title = "Module 4";
//     newBlock31.category = HomeworkEnum.HOMEWORK;
//     newBlock31.order = 4;
//     newBlock31.course = newCourse1;
//     await blockRepository.save<Block>(newBlock31);

//     const newBlock32 = new Block();
//     newBlock32.title = "Module 5";
//     newBlock32.category = HomeworkEnum.HOMEWORK;
//     newBlock32.order = 5;
//     newBlock32.course = newCourse1;
//     await blockRepository.save<Block>(newBlock32);

//     const newBlock33 = new Block();
//     newBlock33.title = "Module 6";
//     newBlock33.category = HomeworkEnum.HOMEWORK;
//     newBlock33.order = 6;
//     newBlock33.course = newCourse1;
//     await blockRepository.save<Block>(newBlock33);

//     const newBlock34 = new Block();
//     newBlock34.title = "Module 7";
//     newBlock34.category = HomeworkEnum.HOMEWORK;
//     newBlock34.order = 7;
//     newBlock34.course = newCourse1;
//     await blockRepository.save<Block>(newBlock34);

//     const newBlock35 = new Block();
//     newBlock35.title = "Module 8";
//     newBlock35.category = HomeworkEnum.HOMEWORK;
//     newBlock35.order = 8;
//     newBlock35.course = newCourse1;
//     await blockRepository.save<Block>(newBlock35);

//     const newBlock36 = new Block();
//     newBlock36.title = "Module 9";
//     newBlock36.category = HomeworkEnum.HOMEWORK;
//     newBlock36.order = 9;
//     newBlock36.course = newCourse1;
//     await blockRepository.save<Block>(newBlock36);

//     const blockList = [
//       newBlock1,
//       newBlock2,
//       newBlock3,
//       newBlock4,
//       newBlock5,
//       newBlock6,
//       newBlock7,
//       newBlock8,
//       newBlock9,
//       newBlock10,
//       newBlock11,
//       newBlock12,
//       newBlock13,
//       newBlock14,
//       newBlock15,
//       newBlock16,
//       newBlock17,
//       newBlock18,
//       newBlock19,
//       newBlock20,
//       newBlock21,
//       newBlock22,
//       newBlock23,
//       newBlock24,
//       newBlock25,
//       newBlock26,
//       newBlock27,
//     ];

//     const titles = [
//       { title: "Ingliz tilida", startBlock: 1, endBlock: 9 },
//       { title: "Arab tilida", startBlock: 10, endBlock: 18 },
//       { title: "Rus tilida", startBlock: 19, endBlock: 27 },
//     ];

//     // Har bir til uchun
//     for (const { title, startBlock, endBlock } of titles) {
//       // Har bir blok uchun faqat tanlangan oralig'dagi bloklarni olamiz
//       for (let i = startBlock - 1; i < endBlock; i++) {
//         const block = blockList[i];

//         // Har bir order uchun 1 dan 100 gacha
//         for (let order = 1; order <= 100; order++) {
//           try {
//             // Bazada shu order va block bilan bog'langan dars bormi?
//             const existingLesson = await lessonRepository.findOne({
//               where: {
//                 block: { id: block.id }, // block ID sini tekshirish
//                 order, // order qiymatini tekshirish
//                 title, // til nomini tekshirish
//               },
//             });

//             // Agar mavjud bo'lmasa, yangi dars qo'shamiz
//             if (!existingLesson) {
//               const lesson = new Lesson();
//               lesson.title = `${title} bo'limi ${order}`;
//               lesson.videoUrl = "https://player.vimeo.com/video/1031009633";
//               lesson.order = order; // Order qiymati 1-15 gacha
//               lesson.mimetype = "video/mp4";
//               lesson.size = 2928407;
//               lesson.block = block; // Har bir darsni aniq blok bilan bog'laymiz
//               lesson.duration = 11; // Har bir dars uchun davomiylikni o'zgartirish

//               // Darsni bazaga saqlash
//               await lessonRepository.save(lesson);
//             } else {
//               console.log(
//                 `Order ${order} bilan block ${block.id} va title ${title} uchun dars allaqachon mavjud.`,
//               );
//             }
//           } catch (error) {
//             console.error(
//               `Order ${order} bilan block ${block.id} va title ${title} uchun darsni saqlashda xato:`,
//               error,
//             );
//           }
//         }
//       }
//     }

//     await queryRunner.commitTransaction();
//   } catch (err) {
//     await queryRunner.rollbackTransaction();
//   } finally {
//     await queryRunner.release();
//   }
// })();


import { connectionSource } from "src/common/config/database.config";
import { GenderEnum, RoleEnum } from "src/common/enums/enum";
import { hashed } from "src/lib/bcrypt";
import { User } from "src/modules/user/entities/user.entity";
import { createConnection, DataSource } from "typeorm";

(async () => {
  const connection: DataSource = await createConnection(connectionSource);

  const queryRunner = connection.createQueryRunner();

  await queryRunner.connect();
  await queryRunner.startTransaction();
  try {
    // **** Faqat direktor yaratish uchun avval barcha foydalanuvchilarni o'chirish **** //
    const userRepository = queryRunner.manager.getRepository(User);
    const users = await userRepository.find();
    await userRepository.remove(users);

    // Direktor foydalanuvchini yaratish
    const director = new User();
    director.firstName = "Ilyosbek";
    director.lastName = "Isaqov";
    director.phoneNumber = "+998335701001";
    director.role = RoleEnum.DIRECTOR;
    director.gender = GenderEnum.MALE;
    director.unhashedPassword = "password";
    director.password = await hashed("password");

    await userRepository.save<User>(director);

    await queryRunner.commitTransaction();
    console.log("Direktor yaratildi va tranzaksiya muvaffaqiyatli yakunlandi.");
  } catch (err) {
    console.error("Xatolik yuz berdi:", err);
    await queryRunner.rollbackTransaction();
  } finally {
    await queryRunner.release();
  }
})();
