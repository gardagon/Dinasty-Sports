import { lista, type Cultura } from './tipos';

/** China: apellido y nombre; aquí se escriben en el orden de Occidente (nombre y apellido). Un apellido. */
export const CHINA: Cultura = {
  id: 'china',
  peso: 5,
  nombres: {
    f: {
      jovenes: lista('Mei, Xiaoyu, Yuxin, Yiyi, Xinyi, Ziyi, Jiayi, Yutong, Shiqi, Ruoxi, Qian, Lan, Ying, Ling, Xia, Yun, Min, Hui, Yan, Jing, Fang, Na, Hong, Juan, Hua, Jie'),
      adultos: lista('Li, Xiu, Yan, Ying, Fang, Jing, Lan, Hui, Na, Ling, Xia, Yun, Min, Hong, Juan, Hua, Jie, Mei, Yu, Qing, Ping, Lin, Xin, Dan, Zhen'),
    },
    m: {
      jovenes: lista('Wei, Jun, Hao, Lei, Ming, Yong, Jian, Tao, Bin, Peng, Kai, Long, Xin, Yu, Zihan, Yichen, Haoran, Zixuan, Yuhang, Jiahao, Ruize, Hanyu'),
      adultos: lista('Wei, Jun, Hao, Lei, Ming, Yong, Jian, Tao, Bin, Chen, Peng, Kai, Long, Xin, Gang, Jie, Hui, Qiang, Yang, Lin, Hong, Bo, Dong, Feng, Guo'),
    },
  },
  apellidos: lista('Wang, Li, Zhang, Liu, Chen, Yang, Huang, Zhao, Wu, Zhou, Xu, Sun, Ma, Zhu, Hu, Guo, He, Lin, Gao, Luo, Zheng, Liang, Xie, Tang, Han, Feng, Deng, Cao, Peng, Zeng, Xiao, Tian, Dong, Pan, Yuan, Cai, Jiang, Yu, Du, Ye, Cheng, Wei, Su, Lu, Ding, Ren'),
  numeroDeApellidos: 1,
};

/** Japón, Corea y Vietnam: un apellido, cada cultura con sus nombres. */
export const JAPON_COREA_VIETNAM: Cultura = {
  id: 'japon_corea_vietnam',
  peso: 1,
  nombres: {
    f: {
      jovenes: lista('Sakura, Yuki, Hana, Aiko, Emi, Rin, Mio, Yui, Haruka, Himari, Ji-woo, Seo-yeon, Ha-eun, Su-bin, Ji-yeon, Eun-ji, Min-seo, Linh, Lan, Anh, Mai, Ngoc, Thu, Hoa'),
      adultos: lista('Yoko, Keiko, Naoko, Kumiko, Yumi, Mi-sook, Eun-hee, Young-ja, Soo-jin, Hye-jin, Thi, Huong, Lan, Linh, Mai, Hoa, Thuy, Lien, Nga, Trang'),
    },
    m: {
      jovenes: lista('Haruto, Yuto, Ren, Sota, Kaito, Hinata, Min-jun, Seo-jun, Ji-ho, Joon-woo, Hyun-woo, Do-yoon, Minh, Duc, Hung, Tuan, Long, Huy, Khoa, Bao'),
      adultos: lista('Hiroshi, Takeshi, Kenji, Takashi, Satoshi, Kazuo, Min-ho, Sung-min, Jae-hyun, Dong-hyun, Young-ho, Hung, Tuan, Minh, Duc, Long, Hai, Nam, Quang, Thanh'),
    },
  },
  apellidos: lista('Sato, Suzuki, Takahashi, Tanaka, Watanabe, Ito, Yamamoto, Nakamura, Kobayashi, Kato, Kim, Lee, Park, Choi, Jung, Kang, Cho, Yoon, Nguyen, Tran, Le, Pham, Hoang, Vu, Dang, Bui'),
  numeroDeApellidos: 1,
};
