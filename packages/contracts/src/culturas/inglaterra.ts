import { lista, type Cultura } from './tipos';

/** Británicos de origen indio y sikh/hindú (Panyab, Guyarat…): un apellido; en las mujeres sikh, «Singh» pasa a «Kaur». */
export const ASIA_SUR_INDIA: Cultura = {
  id: 'asia_sur_india',
  peso: 5,
  nombres: {
    f: {
      jovenes: lista('Aanya, Diya, Ananya, Aisha, Myra, Saanvi, Priya, Anaya, Riya, Kiara, Zara, Tara, Meera, Amara, Isha, Avni, Navya, Kavya, Sia, Mahi'),
      adultos: lista('Sunita, Anita, Rekha, Meena, Kavita, Pooja, Neha, Priya, Geeta, Seema, Anjali, Jasbir, Harjit, Manjit, Parminder, Sandeep, Nisha, Sonia, Poonam, Kiran, Ritu, Jyoti, Sapna, Nirmala, Veena'),
    },
    m: {
      jovenes: lista('Aarav, Vihaan, Arjun, Aditya, Krish, Ishaan, Reyansh, Rohan, Kabir, Dev, Rayan, Aryan, Veer, Armaan, Sai, Ayaan, Neil, Karan, Raj, Samir'),
      adultos: lista('Rajesh, Sanjay, Amit, Vijay, Anil, Sunil, Ravi, Manoj, Deepak, Ashok, Suresh, Harpreet, Gurpreet, Jagdish, Kamal, Nitin, Rahul, Vikram, Rakesh, Prakash, Mukesh, Dinesh, Jasvinder, Balvinder, Pardeep'),
    },
  },
  apellidos: lista('Patel, Singh, Sharma, Kumar, Gupta, Shah, Mehta, Joshi, Desai, Gill, Dhillon, Sandhu, Bansal, Chopra, Kapoor, Malhotra, Verma, Reddy, Nair, Iyer, Rao, Agarwal, Bhatt, Thakkar, Chauhan, Mistry, Pandya, Trivedi, Soni, Sidhu, Grewal, Bains, Sethi, Khanna'),
  numeroDeApellidos: 1,
  femenino: [['Singh', 'Kaur']],
};

/** Británicos de origen paquistaní y bangladesí: un apellido. */
export const ASIA_SUR_MUSULMANA: Cultura = {
  id: 'asia_sur_musulmana',
  peso: 4,
  nombres: {
    f: {
      jovenes: lista('Aisha, Fatima, Zara, Maryam, Amira, Aaliyah, Layla, Hana, Zainab, Safiya, Inaya, Noor, Sana, Amina, Iqra, Alisha, Sofia, Ayesha, Hafsa, Eman'),
      adultos: lista('Shabana, Nasreen, Farzana, Rukhsana, Yasmin, Saira, Shazia, Samina, Nazia, Rubina, Parveen, Razia, Khadija, Amna, Nadia, Sobia, Bushra, Humaira, Sumaira, Fozia'),
    },
    m: {
      jovenes: lista('Muhammad, Ali, Ahmed, Omar, Hamza, Yusuf, Ibrahim, Zayn, Adam, Rayan, Hassan, Bilal, Ayaan, Zain, Usman, Ismail, Idris, Zakariya, Hamid, Danyal'),
      adultos: lista('Mohammed, Mohammad, Imran, Tariq, Asif, Sajid, Naveed, Shahid, Kashif, Irfan, Rizwan, Zahid, Farooq, Abdul, Javed, Nadeem, Waqar, Khalid, Faisal, Shafiq'),
    },
  },
  apellidos: lista('Khan, Ahmed, Ali, Hussain, Shah, Malik, Butt, Iqbal, Akhtar, Chaudhry, Mahmood, Rahman, Islam, Uddin, Miah, Choudhury, Siddique, Sheikh, Qureshi, Ansari, Rashid, Raza, Hassan, Mirza, Bhatti, Awan, Rehman, Aslam, Anwar'),
  numeroDeApellidos: 1,
};

/** Británicos de origen afrocaribeño: nombres y apellidos británicos (con los habituales de la comunidad). Un apellido. */
export const AFROCARIBENO_BRITANICO: Cultura = {
  id: 'afrocaribeno_britanico',
  peso: 1,
  nombres: {
    f: {
      jovenes: lista('Amara, Imani, Nia, Destiny, Zara, Maya, Jade, Kiara, Aaliyah, Shanice, Leila, Ruby, Grace, Faith, Joy, Chloe, Layla, Mia, Ava, Jasmine'),
      adultos: lista('Michelle, Sharon, Paulette, Donna, Beverley, Claudette, Marcia, Angela, Denise, Yvonne, Pauline, Jennifer, Natalie, Sandra, Janet, Carol, Karen, Maxine, Andrea, Joanne'),
    },
    m: {
      jovenes: lista('Jayden, Marcus, Kai, Josiah, Elijah, Malachi, Jamal, Zachary, Isaiah, Leo, Noah, Joshua, Jaylen, Theo, Caleb, Jordan, Kwame, Xavier, Micah, Elliot'),
      adultos: lista('Andrew, Michael, Winston, Delroy, Clive, Errol, Trevor, Leroy, Courtney, Marlon, Desmond, Dwayne, Wayne, Clifton, Lloyd, Everton, Dennis, Paul, Anthony, Junior'),
    },
  },
  apellidos: lista('Williams, Brown, Campbell, Thomas, Johnson, Jackson, Clarke, Henry, Morgan, Francis, Gordon, Reid, Bailey, Grant, Blake, Walker, Murray, Lewis, Samuels, Simpson, Edwards, Richards, Wilson, Taylor, Davis, Green, Wright, Harris, Anderson, Robinson, Mitchell, Stewart, Powell, James, Hamilton, Gray, Lawrence, Barrett, McKenzie, Brooks'),
  numeroDeApellidos: 1,
};
